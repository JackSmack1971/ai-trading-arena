import { WebSocket } from 'ws';
import type {
  MarketFeedAdapter,
  FeedCapability,
  RatePolicy,
  FeedConfig,
  NormalizedMarketEvent,
} from '@arena/core';
import { normalizeCoinbaseTick } from '../normalizers/coinbase.js';

export class CoinbaseFeedAdapter implements MarketFeedAdapter {
  readonly id = 'coinbase';
  readonly name = 'Coinbase Pro Feed';
  readonly authRequired = false;
  readonly capabilities: FeedCapability[] = ['TICKER'];
  readonly ratePolicy: RatePolicy = {
    provider: 'coinbase',
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
  private errorHandler: ((err: Error) => void) | null = null;
  private terminalError: Error | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private isIntentionallyDisconnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

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
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        console.log('Coinbase WebSocket connected');
        
        // Subscribe to current symbols
        if (this.symbols.size > 0) {
          this.sendSubscription(Array.from(this.symbols), 'subscribe');
        }

        if (resolve) resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ticker' && this.eventHandler) {
            const normalized = normalizeCoinbaseTick(msg);
            if (normalized) {
              this.eventHandler(normalized);
            }
          }
        } catch (err) {
          console.error('Error parsing Coinbase message:', err);
        }
      });

      this.ws.on('close', () => {
        if (!this.isIntentionallyDisconnected) {
          console.warn('Coinbase connection closed unexpectedly, attempting reconnect');
          this.handleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        console.error('Coinbase WS Error:', err);
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
      const err = new Error(`Coinbase feed reconnect exhausted after ${this.maxReconnectAttempts} attempts`);
      this.terminalError = err;
      this.isIntentionallyDisconnected = true;
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      console.error('Max Coinbase reconnect attempts reached. Exiting.');
      this.errorHandler?.(err);
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );
    this.reconnectAttempts++;
    console.log(`Reconnecting to Coinbase in ${delay.toFixed(0)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

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
        toSubscribe.push(sym);
      }
    }

    if (toSubscribe.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(toSubscribe, 'subscribe');
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
      this.sendSubscription(toUnsubscribe, 'unsubscribe');
    }
  }

  onEvent(handler: (event: NormalizedMarketEvent) => void): void {
    this.eventHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }

  private sendSubscription(symbols: string[], type: 'subscribe' | 'unsubscribe') {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        type,
        product_ids: symbols,
        channels: ['ticker'],
      })
    );
  }
}
