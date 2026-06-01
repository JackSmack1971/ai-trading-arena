import { describe, expect, it } from 'vitest';
import { computeBollingerBands, computeEma, computeRsi } from '../indicators.js';

describe('computeEma', () => {
  it('returns undefined for all positions before the seed period', () => {
    const closes = [1, 2, 3, 4, 5];
    const result = computeEma(closes, 5);
    expect(result[0]).toBeUndefined();
    expect(result[3]).toBeUndefined();
    expect(result[4]).toBeDefined();
  });

  it('EMA of ascending prices increases over time', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 1000 + i * 10);
    const ema9 = computeEma(closes, 9);
    const last = ema9[ema9.length - 1];
    const second = ema9[ema9.length - 2];
    expect(last).toBeDefined();
    expect(second).toBeDefined();
    expect(last!).toBeGreaterThan(second!);
  });

  it('fast EMA > slow EMA for monotonically ascending prices', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 1000 + i * 10);
    const ema9 = computeEma(closes, 9);
    const ema21 = computeEma(closes, 21);
    const fast = ema9[ema9.length - 1];
    const slow = ema21[ema21.length - 1];
    expect(fast).toBeDefined();
    expect(slow).toBeDefined();
    expect(fast!).toBeGreaterThan(slow!);
  });

  it('returns empty undefined array when insufficient closes', () => {
    const result = computeEma([1, 2], 5);
    expect(result.every((v) => v === undefined)).toBe(true);
  });
});

describe('STRAT-02 static datasets: EMA', () => {
  it('matches the hand-computed SMA seed and smoothing values', () => {
    const closes = [22, 24, 26, 28, 30];
    const result = computeEma(closes, 3);

    expect(result[0]).toBeUndefined();
    expect(result[1]).toBeUndefined();
    // Seed = (22 + 24 + 26) / 3 = 24
    expect(result[2]).toBeCloseTo(24, 6);
    // k = 2 / (3 + 1) = 0.5, so 28 * 0.5 + 24 * 0.5 = 26
    expect(result[3]).toBeCloseTo(26, 6);
    // 30 * 0.5 + 26 * 0.5 = 28
    expect(result[4]).toBeCloseTo(28, 6);
  });
});

describe('computeRsi', () => {
  it('returns undefined when closes < period + 1', () => {
    expect(computeRsi([1, 2, 3], 14)).toBeUndefined();
  });

  it('returns ~100 when all bars gain', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 1000 + i * 10);
    const rsi = computeRsi(closes, 14);
    expect(rsi).toBeDefined();
    expect(rsi!).toBeGreaterThan(90);
  });

  it('returns ~0 when all bars lose', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 1000 - i * 10);
    const rsi = computeRsi(closes, 14);
    expect(rsi).toBeDefined();
    expect(rsi!).toBeLessThan(10);
  });

  it('returns midrange RSI for alternating gains/losses', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 1000 + (i % 2 === 0 ? 5 : -5));
    const rsi = computeRsi(closes, 14);
    expect(rsi).toBeDefined();
    expect(rsi!).toBeGreaterThan(20);
    expect(rsi!).toBeLessThan(80);
  });
});

describe('STRAT-02 static datasets: RSI', () => {
  it('returns exactly 50 for a flat series', () => {
    expect(computeRsi(new Array(20).fill(100), 14)).toBe(50);
  });

  it('returns exactly 100 for an all-gains series', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(computeRsi(closes, 14)).toBe(100);
  });

  it('matches a precomputed Wilder RSI reference value', () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1,
      45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28,
      46.28, 46, 46.03, 46.41, 46.22, 45.64, 46.21,
    ];
    const rsi = computeRsi(closes, 14);

    // Wilder-smoothed RSI reference for this series is 62.8807...
    expect(rsi).toBeCloseTo(62.88, 2);
  });
});

describe('computeBollingerBands', () => {
  it('returns undefined when closes < period', () => {
    expect(computeBollingerBands([1, 2, 3], 20, 2)).toBeUndefined();
  });

  it('flat prices produce very small band width', () => {
    const closes = new Array<number>(20).fill(1000);
    const bands = computeBollingerBands(closes, 20, 2);
    expect(bands).toBeDefined();
    expect(bands!.middle).toBe(1000);
    expect(bands!.upper - bands!.lower).toBeLessThan(0.001);
  });

  it('volatile prices produce wider bands', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 1000 + (i % 2 === 0 ? 50 : -50));
    const stable = computeBollingerBands(new Array<number>(20).fill(1000), 20, 2);
    const volatile = computeBollingerBands(closes, 20, 2);
    expect(volatile!.upper - volatile!.lower).toBeGreaterThan(stable!.upper - stable!.lower);
  });

  it('spike price is above upper band when baseline is stable', () => {
    const closes = [...new Array<number>(19).fill(1000), 1100];
    const bands = computeBollingerBands(closes, 20, 2);
    expect(bands).toBeDefined();
    expect(1100).toBeGreaterThan(bands!.upper);
  });
});

describe('STRAT-02 static dataset: Bollinger Bands', () => {
  it('matches the canonical population-standard-deviation example', () => {
    const closes = [2, 4, 4, 4, 5, 5, 7, 9];
    const bands = computeBollingerBands(closes, 8, 2);

    expect(bands).toBeDefined();
    // Mean = 5 and population std-dev = 2, which intentionally differs from sample variance.
    expect(bands!.middle).toBeCloseTo(5, 6);
    expect(bands!.upper).toBeCloseTo(9, 6);
    expect(bands!.lower).toBeCloseTo(1, 6);
  });
});
