import { describe, expect, it } from 'vitest';
import { MoneyDecimal } from '../money/decimal.js';
import { PnLTracker } from '../pnl.js';

const RUN = 'run-1';
const AGENT = 'agent-a';
const TS = '2024-01-01T00:00:00.000Z';

function makeParams(overrides?: Partial<Parameters<PnLTracker['snapshot']>[0]>) {
  return {
    runId: RUN,
    agentId: AGENT,
    cashBalance: new MoneyDecimal('10000'),
    positionValue: new MoneyDecimal('0'),
    unrealizedPnl: new MoneyDecimal('0'),
    realizedPnl: new MoneyDecimal('0'),
    totalFeesPaid: new MoneyDecimal('0'),
    totalSlippagePaid: new MoneyDecimal('0'),
    tradeCount: 0,
    timestamp: TS,
    ...overrides,
  };
}

describe('PnLTracker', () => {
  it('zero return at start', () => {
    const tracker = new PnLTracker('10000');
    const snap = tracker.snapshot(makeParams());
    expect(snap.totalReturnPct).toBe('0');
    expect(snap.maxDrawdownPct).toBe('0');
  });

  it('equity = cash + positionValue', () => {
    const tracker = new PnLTracker('10000');
    const snap = tracker.snapshot(makeParams({
      cashBalance: new MoneyDecimal('9000'),
      positionValue: new MoneyDecimal('1100'),
    }));
    expect(new MoneyDecimal(snap.equity).toFixed(2)).toBe('10100.00');
  });

  it('positive return percentage', () => {
    const tracker = new PnLTracker('10000');
    const snap = tracker.snapshot(makeParams({
      cashBalance: new MoneyDecimal('10500'),
      positionValue: new MoneyDecimal('0'),
    }));
    // (10500 - 10000) / 10000 * 100 = 5.0%
    expect(new MoneyDecimal(snap.totalReturnPct).toFixed(2)).toBe('5.00');
  });

  it('negative return percentage', () => {
    const tracker = new PnLTracker('10000');
    const snap = tracker.snapshot(makeParams({
      cashBalance: new MoneyDecimal('9500'),
      positionValue: new MoneyDecimal('0'),
    }));
    // (9500 - 10000) / 10000 * 100 = -5.0%
    expect(new MoneyDecimal(snap.totalReturnPct).toFixed(2)).toBe('-5.00');
  });

  it('max drawdown tracks peak-to-trough', () => {
    const tracker = new PnLTracker('10000');
    // Equity rises to 11000
    tracker.snapshot(makeParams({ cashBalance: new MoneyDecimal('11000') }));
    // Then drops to 10000
    const snap = tracker.snapshot(makeParams({ cashBalance: new MoneyDecimal('10000') }));
    // Drawdown = (11000 - 10000) / 11000 * 100 ≈ 9.09%
    const expected = new MoneyDecimal('11000').minus('10000').div('11000').times('100');
    expect(new MoneyDecimal(snap.maxDrawdownPct).toFixed(4)).toBe(expected.toFixed(4));
  });

  it('drawdown zero when equity at or above high-water mark', () => {
    const tracker = new PnLTracker('10000');
    tracker.snapshot(makeParams({ cashBalance: new MoneyDecimal('10000') }));
    const snap = tracker.snapshot(makeParams({ cashBalance: new MoneyDecimal('10500') }));
    expect(new MoneyDecimal(snap.maxDrawdownPct).toFixed(2)).toBe('0.00');
  });

  it('decimal precision: 0.7 + 0.1 equity', () => {
    const tracker = new PnLTracker('0.80');
    const snap = tracker.snapshot(makeParams({
      cashBalance: new MoneyDecimal('0.70'),
      positionValue: new MoneyDecimal('0.10'),
    }));
    expect(new MoneyDecimal(snap.equity).toFixed(2)).toBe('0.80');
    expect(new MoneyDecimal(snap.totalReturnPct).toFixed(2)).toBe('0.00');
  });

  it('tracks trade count and fees', () => {
    const tracker = new PnLTracker('10000');
    const snap = tracker.snapshot(makeParams({
      tradeCount: 5,
      totalFeesPaid: new MoneyDecimal('7.50'),
      totalSlippagePaid: new MoneyDecimal('2.00'),
    }));
    expect(snap.tradeCount).toBe(5);
    expect(new MoneyDecimal(snap.totalFeesPaid).toFixed(2)).toBe('7.50');
    expect(new MoneyDecimal(snap.totalSlippagePaid).toFixed(2)).toBe('2.00');
  });
});
