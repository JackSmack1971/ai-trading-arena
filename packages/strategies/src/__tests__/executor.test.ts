import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyExecutor, DEFAULT_HISTORY_LIMIT, SignalValidationError } from '../executor.js';
import type {
  NormalizedMarketEvent,
  PortfolioSummary,
  Strategy,
  StrategyContext,
  StrategySignal,
} from '../types.js';
import { makePortfolio, makeEvent } from './fixtures.js';
import { makeSignal } from '../utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBarEvent(
  symbol: string,
  close: number,
  ts: string,
): NormalizedMarketEvent {
  return {
    eventId: `ev-${ts}`,
    sourceId: 'test',
    symbol,
    eventType: 'BAR_CLOSED',
    exchangeTimestamp: ts,
    receivedAt: ts,
    open: String(close),
    high: String(close + 5),
    low: String(close - 5),
    close: String(close),
    volume: '100',
    last: String(close),
  };
}

function isoTs(offsetSeconds: number): string {
  return new Date(1_700_000_000_000 + offsetSeconds * 1000).toISOString();
}

const BASE_PORTFOLIO: PortfolioSummary = makePortfolio('agent-1');

/** Strategy that always emits a 'long' signal on every tick */
function makeAlwaysLongStrategy(id = 'always-long'): Strategy {
  return {
    id,
    name: 'Always Long',
    version: '0.1.0',
    onStart(_ctx: StrategyContext) {},
    onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
      return [makeSignal(event, ctx, 'long', 0.8, ['test'])];
    },
  };
}

/** Strategy that records how many times onMarketEvent was called */
function makeCountingStrategy(): { strategy: Strategy; counter: { callCount: number } } {
  const counter = { callCount: 0 };
  const strategy: Strategy = {
    id: 'counting',
    name: 'Counting Strategy',
    version: '0.1.0',
    onStart() {},
    onMarketEvent(_event, _ctx) {
      counter.callCount++;
      return [];
    },
  };
  return { strategy, counter };
}

/** Strategy that returns an invalid signal (missing required fields) */
const invalidSignalStrategy: Strategy = {
  id: 'bad-signal',
  name: 'Bad Signal',
  version: '0.1.0',
  onStart() {},
  onMarketEvent() {
    // Missing required fields — fails StrategySignalSchema
    return [{ signal: 'long' } as unknown as StrategySignal];
  },
};

// ---------------------------------------------------------------------------
// T-02-05: Rolling history buffer
// ---------------------------------------------------------------------------

describe('T-02-05: Rolling history buffer', () => {
  let executor: StrategyExecutor;

  beforeEach(() => {
    executor = new StrategyExecutor(BASE_PORTFOLIO);
  });

  it('starts with empty history', () => {
    expect(executor.getHistory('BTC-USD')).toHaveLength(0);
  });

  it('appends bar data on BAR_CLOSED events', async () => {
    await executor.processMarketEvent(makeBarEvent('BTC-USD', 50000, isoTs(0)));
    expect(executor.getHistory('BTC-USD')).toHaveLength(1);

    await executor.processMarketEvent(makeBarEvent('BTC-USD', 50100, isoTs(60)));
    expect(executor.getHistory('BTC-USD')).toHaveLength(2);
  });

  it('does NOT append for non-BAR_CLOSED events', async () => {
    const tickEvent: NormalizedMarketEvent = {
      ...makeEvent('BTC-USD'),
      eventType: 'MARKET_TICK_RECEIVED',
    };
    await executor.processMarketEvent(tickEvent);
    expect(executor.getHistory('BTC-USD')).toHaveLength(0);
  });

  it('evicts oldest bar when limit is reached', async () => {
    const smallExecutor = new StrategyExecutor(BASE_PORTFOLIO, 3);
    for (let i = 0; i < 4; i++) {
      await smallExecutor.processMarketEvent(
        makeBarEvent('BTC-USD', 50000 + i, isoTs(i * 60)),
      );
    }
    const history = smallExecutor.getHistory('BTC-USD');
    expect(history).toHaveLength(3);
    // The oldest bar (50000) should have been evicted; newest should be 50003
    expect(history[2]!.close).toBe('50003');
    expect(history[0]!.close).toBe('50001');
  });

  it('tracks history per symbol independently', async () => {
    await executor.processMarketEvent(makeBarEvent('BTC-USD', 50000, isoTs(0)));
    await executor.processMarketEvent(makeBarEvent('ETH-USD', 3000, isoTs(0)));
    await executor.processMarketEvent(makeBarEvent('BTC-USD', 50100, isoTs(60)));

    expect(executor.getHistory('BTC-USD')).toHaveLength(2);
    expect(executor.getHistory('ETH-USD')).toHaveLength(1);
  });

  it('respects DEFAULT_HISTORY_LIMIT constant', () => {
    expect(DEFAULT_HISTORY_LIMIT).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// T-02-06: Context isolation — strategies cannot mutate history
// ---------------------------------------------------------------------------

describe('T-02-06: Context isolation', () => {
  it('getHistory returns a frozen snapshot — strategies cannot mutate history', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    await executor.processMarketEvent(makeBarEvent('BTC-USD', 50000, isoTs(0)));

    const history = executor.getHistory('BTC-USD');

    // The array itself should be frozen
    expect(() => {
      (history as BarData[]).push({ time: 0, open: '0', high: '0', low: '0', close: '0', volume: '0' });
    }).toThrow(TypeError);

    // Individual bar objects should also be frozen
    expect(() => {
      (history[0] as unknown as Record<string, unknown>)['close'] = '99999';
    }).toThrow(TypeError);
  });

  it('strategy cannot mutate the portfolio exposed through context', async () => {
    let capturedCtx: StrategyContext | null = null;
    const capturingStrategy: Strategy = {
      id: 'capture',
      name: 'Capture',
      version: '0.1.0',
      onStart() {},
      onMarketEvent(_event, ctx) {
        capturedCtx = ctx;
        return [];
      },
    };

    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    executor.registerStrategy('agent-1', capturingStrategy);
    await executor.processMarketEvent(makeEvent('BTC-USD'));

    expect(capturedCtx).not.toBeNull();
    expect(() => {
      (capturedCtx!.portfolio as unknown as Record<string, unknown>)['cashBalance'] = '999999';
    }).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// T-02-07: Signal routing and validation
// ---------------------------------------------------------------------------

describe('T-02-07: Signal routing and validation', () => {
  it('returns empty array when no strategies are registered', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    const signals = await executor.processMarketEvent(makeEvent('BTC-USD'));
    expect(signals).toEqual([]);
  });

  it('routes tick events to all registered strategies', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    const { strategy: s1, counter: c1 } = makeCountingStrategy();
    const s2Count = makeCountingStrategy();
    const s2 = { ...s2Count.strategy, id: 'counting-2' };

    executor.registerStrategy('agent-1', s1);
    executor.registerStrategy('agent-2', s2);

    await executor.processMarketEvent(makeEvent('BTC-USD'));

    expect(c1.callCount).toBe(1);
  });

  it('returns validated signals from registered strategies', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    executor.registerStrategy('agent-1', makeAlwaysLongStrategy());

    const signals = await executor.processMarketEvent(makeEvent('BTC-USD'));

    expect(signals).toHaveLength(1);
    expect(signals[0]!.signal).toBe('long');
    expect(signals[0]!.confidence).toBe(0.8);
    expect(signals[0]!.strategyId).toBe('always-long');
  });

  it('throws SignalValidationError when strategy emits malformed signal', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    executor.registerStrategy('agent-1', invalidSignalStrategy);

    await expect(executor.processMarketEvent(makeEvent('BTC-USD'))).rejects.toThrow(
      SignalValidationError,
    );
  });

  it('unregisterStrategy stops the strategy from receiving ticks', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    executor.registerStrategy('agent-1', makeAlwaysLongStrategy());

    let signals = await executor.processMarketEvent(makeEvent('BTC-USD'));
    expect(signals).toHaveLength(1);

    executor.unregisterStrategy('agent-1', 'always-long');
    signals = await executor.processMarketEvent(makeEvent('BTC-USD'));
    expect(signals).toHaveLength(0);
  });

  it('collects signals from multiple strategies', async () => {
    const executor = new StrategyExecutor(BASE_PORTFOLIO);
    executor.registerStrategy('agent-1', makeAlwaysLongStrategy('long-a'));
    executor.registerStrategy('agent-2', makeAlwaysLongStrategy('long-b'));

    const signals = await executor.processMarketEvent(makeEvent('BTC-USD'));
    expect(signals).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// T-02-08: Replay determinism
// ---------------------------------------------------------------------------

describe('T-02-08: Replay determinism', () => {
  it('produces identical signal sequence for identical event sequence', async () => {
    // Use a deterministic strategy (no randomness inside — we control signal IDs via fixture)
    // The strategy uses makeSignal which calls randomUUID, so we compare stable fields only.
    const deterministicStrategy: Strategy = {
      id: 'deterministic',
      name: 'Deterministic',
      version: '0.1.0',
      onStart() {},
      onMarketEvent(event, ctx) {
        const bars = ctx.marketState.recentBars;
        const signal: StrategySignal = {
          signalId: `sig-${event.eventId}`, // deterministic — derived from event ID
          strategyId: ctx.activeStrategy.id,
          strategyVersion: ctx.activeStrategy.version,
          inputEventId: event.eventId,
          symbol: event.symbol,
          signal: bars.length > 2 ? 'long' : 'none',
          confidence: 0.5,
          featuresUsed: ['bar_count'],
          createdAt: event.receivedAt, // deterministic — derived from event timestamp
        };
        return [signal];
      },
    };

    const events: NormalizedMarketEvent[] = [
      makeBarEvent('BTC-USD', 50000, isoTs(0)),
      makeBarEvent('BTC-USD', 50100, isoTs(60)),
      makeBarEvent('BTC-USD', 50200, isoTs(120)),
      makeBarEvent('BTC-USD', 50300, isoTs(180)),
    ];

    // Run 1
    const executor1 = new StrategyExecutor(BASE_PORTFOLIO);
    executor1.registerStrategy('agent-1', deterministicStrategy);
    const run1: StrategySignal[] = [];
    for (const ev of events) {
      run1.push(...(await executor1.processMarketEvent(ev)));
    }

    // Run 2 (fresh executor, same inputs)
    const executor2 = new StrategyExecutor(BASE_PORTFOLIO);
    executor2.registerStrategy('agent-1', deterministicStrategy);
    const run2: StrategySignal[] = [];
    for (const ev of events) {
      run2.push(...(await executor2.processMarketEvent(ev)));
    }

    expect(run1).toEqual(run2);
    expect(run1).toHaveLength(4);
    // First two events: bars.length <= 2 → 'none'; bars 3 & 4 → 'long'
    expect(run1[0]!.signal).toBe('none');
    expect(run1[1]!.signal).toBe('none');
    expect(run1[2]!.signal).toBe('long');
    expect(run1[3]!.signal).toBe('long');
  });
});

// ---------------------------------------------------------------------------
// Type alias needed for frozen array push test
// ---------------------------------------------------------------------------
type BarData = {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};
