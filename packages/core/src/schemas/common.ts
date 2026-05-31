import { z } from 'zod';

// ISO-8601 UTC timestamp — all simulator timestamps must be UTC.
export const TimestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof TimestampSchema>;

// Decimal string: arbitrary-precision number with no scientific notation.
export const DecimalStringSchema = z
  .string()
  .min(1, 'Decimal string must not be empty')
  .regex(/^-?\d+(\.\d+)?$/, 'Must be a valid decimal number string (no scientific notation)');
export type DecimalString = z.infer<typeof DecimalStringSchema>;

// Non-negative decimal string (≥ 0).
export const NonNegativeDecimalStringSchema = DecimalStringSchema.refine(
  (val) => !val.startsWith('-'),
  'Must be a non-negative decimal number string',
);
export type NonNegativeDecimalString = z.infer<typeof NonNegativeDecimalStringSchema>;

// Strictly positive decimal string (> 0).
export const PositiveDecimalStringSchema = NonNegativeDecimalStringSchema.refine(
  (val) => parseFloat(val) > 0,
  'Must be a positive decimal number string',
);
export type PositiveDecimalString = z.infer<typeof PositiveDecimalStringSchema>;

// Percentage string: decimal number representing a percentage value (e.g., "5.25" = 5.25%).
export const PercentStringSchema = DecimalStringSchema;
export type PercentString = DecimalString;

// Basis-points string: integer or decimal bps value.
export const BpsStringSchema = NonNegativeDecimalStringSchema;
export type BpsString = NonNegativeDecimalString;

// Stable identifier schemas.
export const RunIdSchema = z.string().min(1, 'RunId required');
export type RunId = z.infer<typeof RunIdSchema>;

export const AgentIdSchema = z.string().min(1, 'AgentId required');
export type AgentId = z.infer<typeof AgentIdSchema>;

export const OrderIdSchema = z.string().min(1, 'OrderId required');
export type OrderId = z.infer<typeof OrderIdSchema>;

export const FillIdSchema = z.string().min(1, 'FillId required');
export type FillId = z.infer<typeof FillIdSchema>;

export const SignalIdSchema = z.string().min(1, 'SignalId required');
export type SignalId = z.infer<typeof SignalIdSchema>;

export const StrategyIdSchema = z.string().min(1, 'StrategyId required');
export type StrategyId = z.infer<typeof StrategyIdSchema>;

export const SymbolSchema = z.string().min(1, 'Symbol required').max(32, 'Symbol too long');
export type Symbol = z.infer<typeof SymbolSchema>;

export const EventIdSchema = z.string().min(1, 'EventId required');
export type EventId = z.infer<typeof EventIdSchema>;
