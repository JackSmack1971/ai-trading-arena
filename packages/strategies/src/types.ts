// Self-contained type definitions — mirrors @arena/core shapes without requiring
// a workspace dep (Windows EISDIR pnpm symlink limitation).

export type SignalDirection =
  | 'long'
  | 'short'
  | 'reduce_long'
  | 'reduce_short'
  | 'close'
  | 'none';

export interface StrategySignal {
  signalId: string;
  strategyId: string;
  strategyVersion: string;
  inputEventId: string;
  symbol: string;
  signal: SignalDirection;
  confidence: number; // 0–1
  featuresUsed: string[];
  createdAt: string; // ISO-8601 UTC
}

export interface BarData {
  time: number; // Unix seconds
  open: string; // decimal string
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface OrderBookLevel {
  price: string;
  quantity: string;
}

export interface OrderBookSummary {
  symbol: string;
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  totalBidDepth: string;
  totalAskDepth: string;
  imbalance: string; // signed decimal — positive = bid-heavy
}

export interface MarketStateSummary {
  symbol: string;
  bid: string;
  ask: string;
  last: string;
  spreadBps: string;
  volume24h: string;
  priceChange24hPct: string;
  recentBars: BarData[]; // ascending time order, max 100
  orderBook?: OrderBookSummary;
  lastUpdatedAt: string;
}

export interface PortfolioSummary {
  agentId: string;
  cashBalance: string;
  equity: string;
  totalPositionValue: string;
  unrealizedPnl: string;
  realizedPnl: string;
  exposurePct: string;
  currentDrawdownPct: string;
  snapshotAt: string;
}

export interface StrategyDescriptor {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface StrategyManifestPermissions {
  network: false;
  filesystem: false;
  can_emit_orders: false;
  can_emit_signals: boolean;
}

export interface StrategyManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  permissions: StrategyManifestPermissions;
}

export type NormalizedEventType =
  | 'MARKET_TICK_RECEIVED'
  | 'ORDERBOOK_UPDATED'
  | 'BAR_CLOSED'
  | 'TRADE_EXECUTED'
  | 'FEED_STATUS_CHANGED';

export interface NormalizedMarketEvent {
  eventId: string;
  sourceId: string;
  symbol: string;
  eventType: NormalizedEventType;
  exchangeTimestamp: string;
  receivedAt: string;
  bid?: string;
  ask?: string;
  last?: string;
  volume?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  latencyMs?: number;
}

export interface PositionUpdate {
  agentId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: string;
  averageEntryPrice: string;
  currentPrice: string;
  unrealizedPnl: string;
  trigger: 'FILL' | 'PRICE_UPDATE' | 'MANUAL';
  timestamp: string;
}

export interface StrategyContext {
  readonly agentId: string;
  readonly runId: string;
  readonly marketState: MarketStateSummary;
  readonly portfolio: PortfolioSummary;
  readonly activeStrategy: StrategyDescriptor;
  readonly nowMs: number;
  log(message: string, data?: Record<string, unknown>): void;
}

export interface Strategy {
  readonly id: string;
  readonly name: string;
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
