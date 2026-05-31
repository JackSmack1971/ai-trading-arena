// Indicator math helpers for built-in strategy signal generation.
// Uses plain float arithmetic — indicators don't need Decimal precision.

// Computes EMA for a series of prices. Returns undefined for positions
// before the first full period seed.
export function computeEma(closes: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = new Array<number | undefined>(closes.length).fill(undefined);
  if (period <= 0 || closes.length < period) return result;

  let seedSum = 0;
  for (let i = 0; i < period; i++) {
    const price = closes[i];
    seedSum += price !== undefined ? price : 0;
  }
  const k = 2 / (period + 1);
  let prev = seedSum / period;
  result[period - 1] = prev;

  for (let i = period; i < closes.length; i++) {
    const price = closes[i];
    prev = (price !== undefined ? price : prev) * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

// Returns the latest RSI value or undefined when there is insufficient data.
// Requires at least period+1 closes.
export function computeRsi(closes: number[], period: number): number | undefined {
  if (closes.length < period + 1) return undefined;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const prev = closes[i - 1] ?? 0;
    const curr = closes[i] ?? 0;
    const change = curr - prev;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const curr = closes[i] ?? 0;
    const change = curr - prev;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgGain === 0 && avgLoss === 0) return 50; // perfectly flat — neutral
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

// Returns Bollinger Bands using the trailing `period` prices.
// Returns undefined when closes.length < period.
export function computeBollingerBands(
  closes: number[],
  period: number,
  stdDevMultiplier: number,
): BollingerBands | undefined {
  if (closes.length < period) return undefined;

  const slice = closes.slice(closes.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  const mean = sum / period;

  const variance = slice.reduce((acc, val) => acc + (val - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: mean + stdDevMultiplier * std,
    middle: mean,
    lower: mean - stdDevMultiplier * std,
  };
}
