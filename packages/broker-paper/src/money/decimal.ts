// Single authoritative MoneyDecimal — re-exported from @arena/core so there
// is exactly one Decimal.clone() configuration across the entire workspace.
export {
  MoneyDecimal,
  ZERO_MONEY,
  MONEY_ROUNDING_MODE,
  MONEY_SCALE_USD,
  MONEY_SCALE_CRYPTO,
  roundForLedger,
  roundForDisplay,
  roundForSettlement,
} from '@arena/core';
