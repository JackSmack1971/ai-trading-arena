import { strategyLogger } from './logger.js';
import { StrategySignalSchema } from './schemas.js';
import type {
  BarData,
  MarketStateSummary,
  NormalizedMarketEvent,
  OrderBookSummary,
  PortfolioSummary,
  Strategy,
  StrategyContext,
  StrategyDescriptor,
  StrategySignal,
} from './types.js';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class SignalValidationError extends Error {
  constructor(
    public readonly strategyId: string,
    public readonly issues: string[],
  ) {
    super(`Invalid signal from strategy "${strategyId}": ${issues.join('; ')}`);
    this.name = 'SignalValidationError';
  }
}

// ---------------------------------------------------------------------------
// History buffer
// ---------------------------------------------------------------------------

/** Maximum bars retained per symbol/timeframe slot. */
export const DEFAULT_HISTORY_LIMIT = 500;

/**
 * Rolling circular buffer for OHLCV bar data.
 * Oldest entry is evicted once capacity is reached.
 */
class HistoryBuffer {
  private readonly _bars: BarData[] = [];
  private readonly _limit: number;

  constructor(limit = DEFAULT_HISTORY_LIMIT) {
    this._limit = limit;
  }

  append(bar: BarData): void {
    if (this._bars.length >= this._limit) {
      this._bars.shift();
    }
    this._bars.push(bar);
  }

  /** Returns a frozen, shallow-copy snapshot — strategies cannot mutate internal state. */
  snapshot(limit?: number): readonly BarData[] {
    const bars = limit !== undefined ? this._bars.slice(-limit) : this._bars.slice();
    return Object.freeze(bars.map((b) => Object.freeze({ ...b })));
  }

  get length(): number {
    return this._bars.length;
  }
}

// ---------------------------------------------------------------------------
// Registered strategy entry
// ---------------------------------------------------------------------------

interface RegisteredStrategy {
  strategy: Strategy;
  descriptor: StrategyDescriptor;
  agentId: string;
}

// ---------------------------------------------------------------------------
// StrategyExecutor
// ---------------------------------------------------------------------------

/**
 * Manages active strategies, per-symbol bar history, and routes incoming
 * market events to each registered strategy.
 *
 * Design decisions (from 02-RESEARCH.md):
 * - History is managed centrally here (STRAT-02: executor-managed, not strategy-managed).
 * - Explicit orchestration: the worker loop calls `processMarketEvent()` directly (STRAT-04).
 * - Signals are validated against `StrategySignalSchema` before being returned.
 * - `StrategyContext` exposes only frozen, readonly data — no globals.
 */
export class StrategyExecutor {
  private readonly _strategies = new Map<string, RegisteredStrategy>();
  /**
   * Key: `${symbol}::${timeframe}` — currently we treat all BAR_CLOSED events
   * as belonging to the '1m' timeframe unless the event carries a `timeframe` field.
   */
  private readonly _history = new Map<string, HistoryBuffer>();
  private readonly _historyLimit: number;

  /** Caller-supplied portfolio snapshot, updated via `updatePortfolio`. */
  private _portfolio: PortfolioSummary;

  /** Latest order-book snapshot per symbol, updated via `updateOrderBook`. */
  private readonly _orderBooks = new Map<string, OrderBookSummary>();

  constructor(
    initialPortfolio: PortfolioSummary,
    historyLimit = DEFAULT_HISTORY_LIMIT,
  ) {
    this._portfolio = initialPortfolio;
    this._historyLimit = historyLimit;
  }

  // -------------------------------------------------------------------------
  // Strategy registration
  // -------------------------------------------------------------------------

  /**
   * Register a strategy instance to run on every incoming tick.
   * Each strategy must have a unique `agentId + strategyId` combination.
   */
  registerStrategy(agentId: string, strategy: Strategy): void {
    const key = `${agentId}::${strategy.id}`;
    this._strategies.set(key, {
      strategy,
      agentId,
      descriptor: {
        id: strategy.id,
        name: strategy.name,
        version: strategy.version,
      },
    });
  }

  /** Remove a previously-registered strategy. */
  unregisterStrategy(agentId: string, strategyId: string): void {
    this._strategies.delete(`${agentId}::${strategyId}`);
  }

  /** Number of currently registered strategies. */
  get strategyCount(): number {
    return this._strategies.size;
  }

  // -------------------------------------------------------------------------
  // State update helpers (called by worker loop before tick processing)
  // -------------------------------------------------------------------------

  updatePortfolio(portfolio: PortfolioSummary): void {
    this._portfolio = portfolio;
  }

  updateOrderBook(symbol: string, orderBook: OrderBookSummary): void {
    this._orderBooks.set(symbol, orderBook);
  }

  // -------------------------------------------------------------------------
  // History buffer access
  // -------------------------------------------------------------------------

  /**
   * Retrieve a frozen readonly snapshot of recent bars for a symbol/timeframe.
   * Returns an empty array if no history exists yet.
   */
  getHistory(symbol: string, timeframe = '1m', limit?: number): readonly BarData[] {
    const key = `${symbol}::${timeframe}`;
    return this._history.get(key)?.snapshot(limit) ?? Object.freeze([]);
  }

  /** Append a bar to the rolling history buffer. Called internally on BAR_CLOSED events. */
  private _appendBar(symbol: string, timeframe: string, bar: BarData): void {
    const key = `${symbol}::${timeframe}`;
    let buf = this._history.get(key);
    if (buf === undefined) {
      buf = new HistoryBuffer(this._historyLimit);
      this._history.set(key, buf);
    }
    buf.append(bar);
  }

  // -------------------------------------------------------------------------
  // Market state builder
  // -------------------------------------------------------------------------

  private _buildMarketState(event: NormalizedMarketEvent): MarketStateSummary {
    const recentBars = this.getHistory(event.symbol) as BarData[];
    const last = recentBars[recentBars.length - 1];
    const lastPrice = event.last ?? last?.close ?? '0';
    const orderBook = this._orderBooks.get(event.symbol);

    const state: MarketStateSummary = {
      symbol: event.symbol,
      bid: event.bid ?? lastPrice,
      ask: event.ask ?? lastPrice,
      last: lastPrice,
      spreadBps: '0',
      volume24h: event.volume ?? '0',
      priceChange24hPct: '0',
      recentBars: recentBars as BarData[],
      lastUpdatedAt: event.receivedAt,
    };
    if (orderBook !== undefined) state.orderBook = orderBook;
    return state;
  }

  // -------------------------------------------------------------------------
  // Core event processing
  // -------------------------------------------------------------------------

  /**
   * Process a single market event.
   *
   * Steps:
   *  1. If the event is `BAR_CLOSED`, append bar data to history.
   *  2. Build a `StrategyContext` from current state (frozen data).
   *  3. Call `onMarketEvent` on every registered strategy.
   *  4. Validate each emitted signal against `StrategySignalSchema`.
   *  5. Return the collected, validated signals.
   *
   * Determinism guarantee: calling this method with identical inputs in the
   * same order always produces identical outputs. No randomness is introduced
   * inside this method; strategies that call `randomUUID` in their own logic
   * will break determinism — that is caught by the static scanner.
   *
   * Error boundary: a strategy that emits an invalid signal is logged and
   * skipped; it never prevents valid signals from other strategies from being
   * collected.
   */
  async processMarketEvent(event: NormalizedMarketEvent): Promise<StrategySignal[]> {
    // 1. Update history for closed bars
    if (event.eventType === 'BAR_CLOSED' && event.open !== undefined) {
      const bar: BarData = {
        time: Math.floor(new Date(event.exchangeTimestamp).getTime() / 1000),
        open: event.open,
        high: event.high ?? event.open,
        low: event.low ?? event.open,
        close: event.close ?? event.last ?? event.open,
        volume: event.volume ?? '0',
      };
      this._appendBar(event.symbol, '1m', bar);
    }

    // 2. Build context (snapshot, not live reference)
    const marketState = this._buildMarketState(event);

    const allSignals: StrategySignal[] = [];

    // 3 + 4. Execute each strategy and collect validated signals
    for (const entry of this._strategies.values()) {
      const ctx = this._buildContext(entry, marketState, event);

      let signals: StrategySignal[];
      try {
        const result = await entry.strategy.onMarketEvent(event, ctx);
        signals = Array.isArray(result) ? result : [result];
      } catch (err) {
        // Strategy threw — log and continue; never crash the executor
        ctx.log(`[executor] Strategy threw during onMarketEvent: ${(err as Error).message}`);
        continue;
      }

      for (const signal of signals) {
        try {
          // Per-strategy validation boundary: an invalid signal from one strategy
          // must not prevent valid signals from other strategies from being collected.
          this._validateSignal(signal, entry.descriptor.id);
          allSignals.push(signal);
        } catch (err) {
          if (err instanceof SignalValidationError) {
            ctx.log(
              `[executor] Invalid signal from strategy "${entry.descriptor.id}" rejected`,
              { strategyId: entry.descriptor.id, issues: err.issues },
            );
          } else {
            ctx.log(`[executor] Unexpected error validating signal: ${(err as Error).message}`);
          }
          // Continue to next signal/strategy — never crash the executor
        }
      }
    }

    return allSignals;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Call `onStart` for every registered strategy.
   * Should be called once before the simulation loop starts.
   */
  async startAll(runId: string): Promise<void> {
    const nowMs = Date.now();
    for (const entry of this._strategies.values()) {
      const ctx = this._buildBootstrapContext(entry, runId, nowMs);
      if (entry.strategy.onStart) {
        await entry.strategy.onStart(ctx);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Context builders
  // -------------------------------------------------------------------------

  private _buildContext(
    entry: RegisteredStrategy,
    marketState: MarketStateSummary,
    event: NormalizedMarketEvent,
  ): StrategyContext {
    const logger = strategyLogger.child({
      agentId: entry.agentId,
      strategyId: entry.descriptor.id,
      runId: `run-${entry.agentId}`,
    });
    return Object.freeze({
      agentId: entry.agentId,
      runId: `run-${entry.agentId}`,
      nowMs: new Date(event.receivedAt).getTime(),
      activeStrategy: Object.freeze({ ...entry.descriptor }),
      portfolio: Object.freeze({ ...this._portfolio }),
      marketState: Object.freeze(marketState),
      log(message: string, data?: Record<string, unknown>): void {
        logger.info(data ?? {}, message);
      },
    });
  }

  private _buildBootstrapContext(
    entry: RegisteredStrategy,
    runId: string,
    nowMs: number,
  ): StrategyContext {
    const logger = strategyLogger.child({
      agentId: entry.agentId,
      strategyId: entry.descriptor.id,
      runId,
    });
    const emptyMarketState: MarketStateSummary = {
      symbol: 'NONE',
      bid: '0',
      ask: '0',
      last: '0',
      spreadBps: '0',
      volume24h: '0',
      priceChange24hPct: '0',
      recentBars: [],
      lastUpdatedAt: new Date(nowMs).toISOString(),
    };
    return Object.freeze({
      agentId: entry.agentId,
      runId,
      nowMs,
      activeStrategy: Object.freeze({ ...entry.descriptor }),
      portfolio: Object.freeze({ ...this._portfolio }),
      marketState: Object.freeze(emptyMarketState),
      log(message: string, data?: Record<string, unknown>): void {
        logger.info(data ?? {}, message);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Signal validation
  // -------------------------------------------------------------------------

  private _validateSignal(signal: StrategySignal, strategyId: string): void {
    const result = StrategySignalSchema.safeParse(signal);
    if (!result.success) {
      const issues = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new SignalValidationError(strategyId, issues);
    }
  }
}
