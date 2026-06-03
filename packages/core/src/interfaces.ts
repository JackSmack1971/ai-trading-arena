import type { FeedCapability, FeedConfig, RatePolicy } from './schemas/instrument.js';
import type { NormalizedMarketEvent } from './schemas/market.js';
import type { MarketStateSummary } from './schemas/market.js';
import type { PortfolioSummary } from './schemas/broker.js';
import type { StrategyDescriptor, StrategySignal, PositionUpdate } from './schemas/strategy.js';

// Feed adapter contract — all adapters must use public/no-auth endpoints.
export interface MarketFeedAdapter {
  readonly id: string;
  readonly name: string;
  readonly authRequired: false;
  readonly capabilities: FeedCapability[];
  readonly ratePolicy: RatePolicy;

  connect(config: FeedConfig): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): Promise<void>;
  onEvent(handler: (event: NormalizedMarketEvent) => void): void;
  onError(handler: (err: Error) => void): void;
}

// Minimal context available to a strategy during signal generation.
export interface StrategyContext {
  readonly agentId: string;
  readonly runId: string;
  readonly marketState: MarketStateSummary;
  readonly portfolio: PortfolioSummary;
  readonly activeStrategy: StrategyDescriptor;
  readonly nowMs: number;

  log(message: string, data?: Record<string, unknown>): void;
}

// Strategy SDK interface — signal-only; no order emission permitted.
export interface Strategy {
  readonly id: string;
  readonly version: string;

  onStart(ctx: StrategyContext): Promise<void> | void;

  onMarketEvent(
    event: NormalizedMarketEvent,
    ctx: StrategyContext,
  ): Promise<StrategySignal[]> | StrategySignal[];

  onPositionUpdate?(
    update: PositionUpdate,
    ctx: StrategyContext,
  ): Promise<StrategySignal[]> | StrategySignal[];
}
