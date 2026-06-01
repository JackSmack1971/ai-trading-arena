import { WebSocket } from 'ws';
import type {
  MarketFeedAdapter,
  FeedCapability,
  RatePolicy,
  FeedConfig,
  NormalizedMarketEvent,
} from '@arena/core';
import { normalizeCoinbaseTick } from '../normalizers/coinbase.js';
import { feedLogger } from '../logger.js';
import { getFeedRateLimiter } from '../limiters.js';

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
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isAlive = false;
  private logger = feedLogger.child({ adapter: 'coinbase' });
  private readonly rateLimiter = getFeedRateLimiter(this.ratePolicy, 'ws');

  connect(config: FeedConfig): Promise<void> {
    this.config = config;
    this.isIntentionallyDisconnected = false;
    return new Promise((resolve, reject) => {
      this.reconnectAttempts = 0;
      this.doConnect(resolve, reject);
    });
  }

  private doConnect(resolve?: () => void, reject?: (err: Error) => void) {
    try {
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com', undefined, { perMessageDeflate: false });

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.isAlive = true;
        this.startHeartbeat();
        this.logger.info({ event: 'feed.connected' }, 'Coinbase WebSocket connected');

        // Subscribe to current symbols
        if (this.symbols.size > 0) {
          void this.scheduleSubscription(Array.from(this.symbols), 'subscribe');
        }

        if (resolve) resolve();
      });

      this.ws.on('pong', () => {
        this.isAlive = true;
        this.logger.debug({ event: 'feed.pong' }, 'Coinbase WebSocket pong received');
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
          this.logger.error({ err, event: 'feed.parse_failed' }, 'Error parsing Coinbase message');
        }
      });

      this.ws.on('close', () => {
        this.stopHeartbeat();
        if (!this.isIntentionallyDisconnected) {
          this.logger.warn({ event: 'feed.closed' }, 'Coinbase connection closed unexpectedly, attempting reconnect');
          this.handleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        this.logger.error({ err, event: 'feed.ws_error' }, 'Coinbase WS error');
        if (reject && this.reconnectAttempts === 0) {
          reject(err);
        }
      });
    } catch (err) {
      if (reject) reject(err as Error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws) return;
      if (!this.isAlive) {
        this.logger.warn({ event: 'feed.heartbeat_failed' }, 'WebSocket heartbeat missed, terminating feed');
        this.stopHeartbeat();
        this.ws.terminate();
        if (!this.isIntentionallyDisconnected) {
          this.handleReconnect();
        }
        return;
      }
      this.isAlive = false;
      this.ws.ping();
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
      this.logger.error(
        { event: 'feed.reconnect_exhausted', attempts: this.maxReconnectAttempts },
        'Coinbase reconnect attempts exhausted',
      );
      this.errorHandler?.(err);
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000,
    );
    this.reconnectAttempts++;
    this.logger.warn(
      {
        event: 'feed.reconnect_scheduled',
        attempt: this.reconnectAttempts,
        max: this.maxReconnectAttempts,
        delayMs: Math.round(delay),
      },
      'Reconnecting to Coinbase',
    );

    void this.rateLimiter.schedule(
      {
        id: `reconnect-${this.reconnectAttempts}-${Date.now()}`,
        weight: 1,
        expiration: Math.ceil(delay) + 30_000,
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (!this.isIntentionallyDisconnected) {
          this.doConnect();
        }
      },
    );
  }

  async disconnect(): Promise<void> {
    this.isIntentionallyDisconnected = true;
    this.stopHeartbeat();
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
      await this.scheduleSubscription(toSubscribe, 'subscribe');
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
      await this.scheduleSubscription(toUnsubscribe, 'unsubscribe');
    }
  }

  onEvent(handler: (event: NormalizedMarketEvent) => void): void {
    this.eventHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }

  private scheduleSubscription(symbols: string[], type: 'subscribe' | 'unsubscribe'): Promise<void> {
    return this.rateLimiter.schedule({ id: `${type}-${symbols.join(',')}-${Date.now()}`, expiration: 30_000 }, () => {
      this.sendSubscription(symbols, type);
    });
  }

  private sendSubscription(symbols: string[], type: 'subscribe' | 'unsubscribe') {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        type,
        product_ids: symbols,
        channels: ['ticker'],
      }),
    );
  }
}
