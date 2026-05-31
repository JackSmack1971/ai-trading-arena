---
name: decimal-money-pnl
description: Decimal.js money, pricing, and P&L calculation standards.
globs:
  - "src/**/*.{ts,tsx,js,jsx}"
  - "lib/**/*.{ts,tsx,js,jsx}"
  - "app/**/*.{ts,tsx,js,jsx}"
  - "packages/**/*.{ts,tsx,js,jsx}"
  - "test/**/*.{ts,tsx,js,jsx}"
  - "tests/**/*.{ts,tsx,js,jsx}"
---
# Decimal.js Money and P&L
## Scope
- Apply these rules to code that represents money, fees, balances, equity, prices, notional values, realized P&L, unrealized P&L, or account performance.
- Route every money/P&L Decimal through one project module, such as `src/money/decimal.ts`, exporting a cloned constructor named `MoneyDecimal`.
- Configure `MoneyDecimal` with `Decimal.clone` or `Decimal.set` before first use, and record the selected `precision`, `rounding`, `toExpNeg`, and `toExpPos` in that module.
- Use `precision: 28` and `Decimal.ROUND_HALF_UP` for cent-settled financial arithmetic unless a domain spec in the same module names a different rounding mode.

## Construction
- Construct money/P&L decimals from strings, database text, integer minor-unit strings, or existing Decimal instances.
- Convert JavaScript `number` inputs to strings at trusted adapters after range validation, then construct `MoneyDecimal` from the validated string.
- Preserve external API and database values as strings until they enter the money/P&L adapter.
- Represent zero money/P&L values with `new MoneyDecimal('0')` or a shared `ZERO_MONEY` constant from the project money module.

## Arithmetic
- Express all money/P&L arithmetic with Decimal methods: `plus`, `minus`, `times`, `div`, and `abs`.
- Reassign or return the result of each Decimal operation because Decimal instances are immutable.
- Keep intermediate P&L calculations as Decimal values through the full calculation pipeline.
- Compare money/P&L values with `equals`, `comparedTo`, `greaterThan`, or `lessThan`.
- Use explicit fee, slippage, tax, and funding-rate Decimal variables in P&L formulas before computing net P&L.
- Name realized and unrealized P&L variables with `realizedPnl` and `unrealizedPnl` prefixes or suffixes.

## Rounding and Formatting
- Apply `toDP(currency.scale, MONEY_ROUNDING_MODE)` at settlement, ledger-write, invoice, and display boundaries.
- Apply `toFixed(currency.scale)` when serializing settled money/P&L for UI, CSV, JSON, logs, or database text columns.
- Store persisted money/P&L as fixed-point strings or integer minor-unit strings with a declared currency scale.
- Include the rounding boundary name in helper names, such as `roundForLedger`, `roundForDisplay`, or `roundForSettlement`.

## Verification
- Add unit tests for every helper that computes gross P&L, fees, net P&L, percentage return, or currency conversion.
- Include at least one regression test with `0.7 + 0.1` equivalent inputs represented as strings and expected exact Decimal output.
- Include positive, negative, zero, and fractional-cent cases for each P&L calculation helper.
- Assert serialized outputs with exact strings from `toFixed` or `toString`.
- Document each currency scale and rounding mode in the money module next to the Decimal configuration.
