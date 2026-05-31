import { describe, expect, it } from 'vitest';
import { doNothingBaseline } from '../built-ins/do-nothing-baseline.js';
import { meanReversionBasic } from '../built-ins/mean-reversion-basic.js';
import { momentumBasic } from '../built-ins/momentum-basic.js';
import { orderbookImbalance } from '../built-ins/orderbook-imbalance.js';
import { volatilityBreakout } from '../built-ins/volatility-breakout.js';
import { StrategySignalSchema } from '../schemas.js';
import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { ascendingBars, descendingBars, flatBars, makeCtx, makeEvent, makeOrderBook } from './fixtures.js';

async function call(
  strategy: Strategy,
  event: NormalizedMarketEvent,
  ctx: StrategyContext,
): Promise<StrategySignal[]> {
  return Promise.resolve(strategy.onMarketEvent(event, ctx));
}

// ──────────────────────────────────────────────────────────────────────
// do-nothing-baseline
// ──────────────────────────────────────────────────────────────────────
describe('doNothingBaseline', () => {
  it('always returns empty signals regardless of bars', async () => {
    const signals = await call(doNothingBaseline, makeEvent(), makeCtx(ascendingBars(30, 1000, 10)));
    expect(signals).toHaveLength(0);
  });

  it('returns empty signals with zero bars', async () => {
    const signals = await call(doNothingBaseline, makeEvent(), makeCtx([]));
    expect(signals).toHaveLength(0);
  });

  it('returns empty signals with order book present', async () => {
    const signals = await call(doNothingBaseline, makeEvent(), makeCtx([], makeOrderBook('0.8')));
    expect(signals).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// momentum-basic
// ──────────────────────────────────────────────────────────────────────
describe('momentumBasic', () => {
  it('returns long signal for ascending prices (fast EMA > slow EMA)', async () => {
    const ctx = makeCtx(ascendingBars(30, 1000, 10));
    const signals = await call(momentumBasic, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('long');
  });

  it('returns short signal for descending prices (fast EMA < slow EMA)', async () => {
    const ctx = makeCtx(descendingBars(30, 1000, 10));
    const signals = await call(momentumBasic, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('short');
  });

  it('returns empty when fewer than 22 bars', async () => {
    const ctx = makeCtx(ascendingBars(20, 1000, 10));
    const signals = await call(momentumBasic, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('signal carries ema_9 and ema_21 as features', async () => {
    const ctx = makeCtx(ascendingBars(30, 1000, 10));
    const signals = await call(momentumBasic, makeEvent(), ctx);
    expect(signals[0]!.featuresUsed).toContain('ema_9');
    expect(signals[0]!.featuresUsed).toContain('ema_21');
  });

  it('signal passes Zod schema validation', async () => {
    const ctx = makeCtx(ascendingBars(30, 1000, 10));
    const signals = await call(momentumBasic, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(() => StrategySignalSchema.parse(signals[0])).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────
// mean-reversion-basic
// ──────────────────────────────────────────────────────────────────────
describe('meanReversionBasic', () => {
  it('returns long signal when RSI < 28 (crash prices)', async () => {
    // 20 bars crashing 3% each → RSI approaches 0
    const closes = Array.from({ length: 20 }, (_, i) => 1000 * Math.pow(0.97, i));
    const bars = closes.map((c, i) => ({
      time: 1700000000 + i * 60,
      open: String(c),
      high: String(c),
      low: String(c),
      close: String(c),
      volume: '100',
    }));
    const ctx = makeCtx(bars);
    const signals = await call(meanReversionBasic, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('long');
  });

  it('returns reduce_long signal when RSI > 72 (surge prices)', async () => {
    // 20 bars rising 3% each → RSI approaches 100
    const closes = Array.from({ length: 20 }, (_, i) => 1000 * Math.pow(1.03, i));
    const bars = closes.map((c, i) => ({
      time: 1700000000 + i * 60,
      open: String(c),
      high: String(c),
      low: String(c),
      close: String(c),
      volume: '100',
    }));
    const ctx = makeCtx(bars);
    const signals = await call(meanReversionBasic, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('reduce_long');
  });

  it('returns empty for neutral oscillating prices (RSI in 28–72 range)', async () => {
    const ctx = makeCtx(flatBars(20, 1000));
    const signals = await call(meanReversionBasic, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('returns empty when fewer than 15 bars', async () => {
    const ctx = makeCtx(descendingBars(10, 1000, 10));
    const signals = await call(meanReversionBasic, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('long signal carries rsi_14 as feature', async () => {
    const closes = Array.from({ length: 20 }, (_, i) => 1000 * Math.pow(0.97, i));
    const bars = closes.map((c, i) => ({
      time: 1700000000 + i * 60,
      open: String(c),
      high: String(c),
      low: String(c),
      close: String(c),
      volume: '100',
    }));
    const signals = await call(meanReversionBasic, makeEvent(), makeCtx(bars));
    expect(signals[0]!.featuresUsed).toContain('rsi_14');
  });
});

// ──────────────────────────────────────────────────────────────────────
// volatility-breakout
// ──────────────────────────────────────────────────────────────────────
describe('volatilityBreakout', () => {
  it('returns long signal when price spikes above upper Bollinger band', async () => {
    // 19 stable bars at 1000 → tight bands; spike to 1100 breaks upper
    const bars = [
      ...flatBars(19, 1000),
      { time: 1700001140, open: '1100', high: '1100', low: '1100', close: '1100', volume: '100' },
    ];
    const ctx = makeCtx(bars);
    const signals = await call(volatilityBreakout, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('long');
  });

  it('returns short signal when price spikes below lower Bollinger band', async () => {
    const bars = [
      ...flatBars(19, 1000),
      { time: 1700001140, open: '900', high: '900', low: '900', close: '900', volume: '100' },
    ];
    const ctx = makeCtx(bars);
    const signals = await call(volatilityBreakout, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('short');
  });

  it('returns empty for price within bands', async () => {
    const ctx = makeCtx(flatBars(20, 1000));
    const signals = await call(volatilityBreakout, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('returns empty when fewer than 20 bars', async () => {
    const ctx = makeCtx(ascendingBars(19, 1000, 10));
    const signals = await call(volatilityBreakout, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('long signal carries bollinger features', async () => {
    const bars = [
      ...flatBars(19, 1000),
      { time: 1700001140, open: '1100', high: '1100', low: '1100', close: '1100', volume: '100' },
    ];
    const signals = await call(volatilityBreakout, makeEvent(), makeCtx(bars));
    expect(signals[0]!.featuresUsed).toContain('bollinger_upper');
  });
});

// ──────────────────────────────────────────────────────────────────────
// orderbook-imbalance
// ──────────────────────────────────────────────────────────────────────
describe('orderbookImbalance', () => {
  it('returns long signal for strong positive imbalance', async () => {
    const ctx = makeCtx([], makeOrderBook('0.35'));
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('long');
  });

  it('returns short signal for strong negative imbalance', async () => {
    const ctx = makeCtx([], makeOrderBook('-0.35'));
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signal).toBe('short');
  });

  it('returns empty when no order book', async () => {
    const ctx = makeCtx([]);
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('returns empty when imbalance below threshold', async () => {
    const ctx = makeCtx([], makeOrderBook('0.10'));
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals).toHaveLength(0);
  });

  it('confidence scales with imbalance magnitude', async () => {
    const lo = await call(orderbookImbalance, makeEvent(), makeCtx([], makeOrderBook('0.25')));
    const hi = await call(orderbookImbalance, makeEvent(), makeCtx([], makeOrderBook('0.80')));
    expect(hi[0]!.confidence).toBeGreaterThanOrEqual(lo[0]!.confidence);
  });

  it('confidence is capped at 0.9', async () => {
    const ctx = makeCtx([], makeOrderBook('2.0'));
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals[0]!.confidence).toBeLessThanOrEqual(0.9);
  });

  it('signal carries orderbook_imbalance feature', async () => {
    const ctx = makeCtx([], makeOrderBook('0.35'));
    const signals = await call(orderbookImbalance, makeEvent(), ctx);
    expect(signals[0]!.featuresUsed).toContain('orderbook_imbalance');
  });
});
