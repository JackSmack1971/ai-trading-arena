import { Decimal } from 'decimal.js';

// Single authoritative Decimal constructor for all money/P&L arithmetic.
// precision: 28 — covers all cent-settled and crypto-scale values.
// rounding: ROUND_HALF_UP (4) — standard financial rounding.
export const MoneyDecimal = Decimal.clone({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -28,
  toExpPos: 28,
});

export type MoneyDecimal = InstanceType<typeof MoneyDecimal>;

export const ZERO_MONEY = new MoneyDecimal('0');
export const MONEY_ROUNDING_MODE = Decimal.ROUND_HALF_UP;
export const MONEY_PRECISION = 28;

// Currency scales (decimal places used at settlement / display boundaries).
export const MONEY_SCALE_USD = 2;
export const MONEY_SCALE_CRYPTO = 8;

export function roundForLedger(value: MoneyDecimal, scale = MONEY_SCALE_USD): MoneyDecimal {
  return new MoneyDecimal(value.toDP(scale, MONEY_ROUNDING_MODE).toString());
}

export function roundForDisplay(value: MoneyDecimal, scale = MONEY_SCALE_USD): string {
  return value.toDP(scale, MONEY_ROUNDING_MODE).toFixed(scale);
}

export function roundForSettlement(value: MoneyDecimal, scale = MONEY_SCALE_USD): string {
  return value.toDP(scale, MONEY_ROUNDING_MODE).toFixed(scale);
}
