import { WebSocket } from 'ws';
import type {
  MarketFeedAdapter,
  FeedCapability,
  RatePolicy,
  FeedConfig,
  NormalizedMarketEvent,
} from '@arena/core';
import { normalizeBinanceTrade } from '../normalizers/binance.js';

export class BinanceFeedAdapter implements MarketFeedAdapter {
  readonly id = 'binance';
  readonly name = 'Binance Spot Feed';
  readonly authRequired = false;
  readonly capabilities: FeedCapability[] = ['TICKER'];
  readonly ratePolicy: RatePolicy = {
    provider: 'binance',
    limits: [
      {
        scope: 'request',
        max: 5,
        intervalMs: 1000,
      },
    ],
    backoff: {
      initialMs: 1000,
      maxMs: 30000,
      jitter: true,
    },
  };

  private ws: WebSocket | null = null;
  private config: FeedConfig | null = null;
  private symbols: Set<string> = new Set();
  private eventHandler: ((event: NormalizedMarketEvent) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private isIntentionallyDisconnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Track map of binance ticker name (e.g. btcusdt) -> original symbol format (e.g. BTC-USDT)
  private symbolMap: Map<string, string> = new Map();

  connect(config: FeedConfig): Promise<void> {
    this.config = config;
    this.isIntentionallyDisconnected = false;
    return new Promise((resolve, reject) => {
      this.reconnectAttempts = 0;
      this.doConnect(resolve, reject);
    });
  }

  private doConnect(resolve?: () => void, reject?: (err: Error) => void) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        console.log('Binance WebSocket connected');
        
        // Subscribe to current symbols
        if (this.symbols.size > 0) {
          this.sendSubscription(Array.from(this.symbols), 'SUBSCRIBE');
        }

        if (resolve) resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.e === 'trade' && this.eventHandler) {
            // Restore original symbol mapping
            const lowerSymbol = msg.s.toLowerCase();
            const originalSymbol = this.symbolMap.get(lowerSymbol) || msg.s;
            const normalized = normalizeBinanceTrade({
              ...msg,
              s: originalSymbol,
            });
            this.eventHandler(normalized);
          }
        } catch (err) {
          console.error('Error parsing Binance message:', err);
        }
      });

      this.ws.on('close', () => {
        if (!this.isIntentionallyDisconnected) {
          console.warn('Binance connection closed unexpectedly, attempting reconnect');
          this.handleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        console.error('Binance WS Error:', err);
        if (reject && this.reconnectAttempts === 0) {
          reject(err);
        }
      });
    } catch (err) {
      if (reject) reject(err as Error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max Binance reconnect attempts reached. Exiting.');
      process.exit(1);
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );
    this.reconnectAttempts++;
    console.log(`Reconnecting to Binance in ${delay.toFixed(0)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.isIntentionallyDisconnected = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async subscribe(symbols: string[]): Promise<void> {
    const toSubscribe: string[] = [];
    for (const sym of symbols) {
      if (!this.symbols.has(sym)) {
        this.symbols.add(sym);
        // Map BTC-USDT -> btcusdt
        const binanceKey = sym.toLowerCase().replace('-', '');
        this.symbolMap.set(binanceKey, sym);
        toSubscribe.push(sym);
      }
    }

    if (toSubscribe.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(toSubscribe, 'SUBSCRIBE');
    }
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    const toUnsubscribe: string[] = [];
    for (const sym of symbols) {
      if (this.symbols.has(sym)) {
        this.symbols.delete(sym);
        toUnsubscribe.push(sym);
      }
    }

    if (toUnsubscribe.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(toUnsubscribe, 'UNSUBSCRIBE');
    }
  }

  onEvent(handler: (event: NormalizedMarketEvent) => void): void {
    this.eventHandler = handler;
  }

  private sendSubscription(symbols: string[], method: 'SUBSCRIBE' | 'UNSUBSCRIBE') {
    if (!this.ws) return;
    const params = symbols.map(s => `${s.toLowerCase().replace('-', '')}@trade`);
    this.ws.send(
      JSON.stringify({
        method,
        params,
        id: Date.now(),
      })
    );
  }
}
