import type {
  BarData,
  MarketStateSummary,
  NormalizedMarketEvent,
  OrderBookSummary,
  PortfolioSummary,
  StrategyContext,
  StrategyDescriptor,
} from '../types.js';

const TS = '2024-01-01T00:00:00.000Z';

export function makeBar(close: number, time: number): BarData {
  return {
    time,
    open: String(close),
    high: String(close + close * 0.005),
    low: String(close - close * 0.005),
    close: String(close),
    volume: '100',
  };
}

export function ascendingBars(n: number, start: number, step: number): BarData[] {
  return Array.from({ length: n }, (_, i) => makeBar(start + i * step, 1700000000 + i * 60));
}

export function descendingBars(n: number, start: number, step: number): BarData[] {
  return Array.from({ length: n }, (_, i) => makeBar(start - i * step, 1700000000 + i * 60));
}

export function flatBars(n: number, price: number): BarData[] {
  return Array.from({ length: n }, (_, i) => makeBar(price, 1700000000 + i * 60));
}

export function makePortfolio(agentId = 'agent-1'): PortfolioSummary {
  return {
    agentId,
    cashBalance: '10000',
    equity: '10000',
    totalPositionValue: '0',
    unrealizedPnl: '0',
    realizedPnl: '0',
    exposurePct: '0',
    currentDrawdownPct: '0',
    snapshotAt: TS,
  };
}

export function makeDescriptor(id = 'test-strategy'): StrategyDescriptor {
  return { id, name: id, version: '0.1.0' };
}

export function makeMarketState(
  bars: BarData[],
  orderBook?: OrderBookSummary,
): MarketStateSummary {
  const last = bars[bars.length - 1];
  const lastClose = last !== undefined ? last.close : '50000';
  const state: MarketStateSummary = {
    symbol: 'BTC-USD',
    bid: lastClose,
    ask: String(parseFloat(lastClose) + 10),
    last: lastClose,
    spreadBps: '2',
    volume24h: '1000',
    priceChange24hPct: '0.5',
    recentBars: bars,
    lastUpdatedAt: TS,
  };
  if (orderBook !== undefined) state.orderBook = orderBook;
  return state;
}

export function makeCtx(bars: BarData[], orderBook?: OrderBookSummary): StrategyContext {
  return {
    agentId: 'agent-1',
    runId: 'run-1',
    nowMs: Date.now(),
    activeStrategy: makeDescriptor(),
    portfolio: makePortfolio(),
    marketState: makeMarketState(bars, orderBook),
    log() {},
  };
}

export function makeEvent(symbol = 'BTC-USD'): NormalizedMarketEvent {
  return {
    eventId: 'ev-test-1',
    sourceId: 'test-feed',
    symbol,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp: TS,
    receivedAt: TS,
    bid: '50000',
    ask: '50010',
    last: '50005',
  };
}

export function makeOrderBook(imbalance: string): OrderBookSummary {
  return {
    symbol: 'BTC-USD',
    timestamp: TS,
    bids: [{ price: '50000', quantity: '1' }],
    asks: [{ price: '50010', quantity: '1' }],
    totalBidDepth: '1',
    totalAskDepth: '1',
    imbalance,
  };
}
