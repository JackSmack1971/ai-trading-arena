import { z } from 'zod';
import { AgentIdSchema, DecimalStringSchema, NonNegativeDecimalStringSchema, RunIdSchema, TimestampSchema } from './common.js';

export const RiskRuleIdSchema = z.enum([
  'MAX_POSITION_SIZE',
  'MAX_SYMBOL_EXPOSURE',
  'MAX_TOTAL_EXPOSURE',
  'MAX_DRAWDOWN',
  'MAX_ORDERS_PER_MINUTE',
  'MAX_STRATEGY_SWITCHES_PER_HOUR',
  'NO_NEGATIVE_CASH',
  'NO_LEVERAGE',
  'NO_REAL_EXECUTION',
  'INSUFFICIENT_BALANCE',
]);
export type RiskRuleId = z.infer<typeof RiskRuleIdSchema>;

export const RiskConfigSchema = z.object({
  maxPositionPct: NonNegativeDecimalStringSchema,
  maxSymbolExposurePct: NonNegativeDecimalStringSchema,
  maxTotalExposurePct: NonNegativeDecimalStringSchema,
  maxDrawdownPct: NonNegativeDecimalStringSchema,
  maxOrdersPerMinute: z.number().int().positive(),
  maxStrategySwitchesPerHour: z.number().int().positive(),
  allowNegativeCash: z.literal(false),
  allowLeverage: z.literal(false),
  allowRealExecution: z.literal(false),
});
export type RiskConfig = z.infer<typeof RiskConfigSchema>;

export const DefaultRiskConfig: RiskConfig = {
  maxPositionPct: '10',
  maxSymbolExposurePct: '20',
  maxTotalExposurePct: '80',
  maxDrawdownPct: '5',
  maxOrdersPerMinute: 10,
  maxStrategySwitchesPerHour: 4,
  allowNegativeCash: false,
  allowLeverage: false,
  allowRealExecution: false,
};

export const RiskStateSchema = z.object({
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  currentDrawdownPct: NonNegativeDecimalStringSchema,
  maxDrawdownPct: NonNegativeDecimalStringSchema,
  positionValueUsd: NonNegativeDecimalStringSchema,
  totalExposurePct: NonNegativeDecimalStringSchema,
  ordersThisMinute: z.number().int().nonnegative(),
  strategySwitchesThisHour: z.number().int().nonnegative(),
  lastEvaluatedAt: TimestampSchema,
});
export type RiskState = z.infer<typeof RiskStateSchema>;

export const RiskDecisionSchema = z.enum(['PASSED', 'REJECTED']);
export type RiskDecision = z.infer<typeof RiskDecisionSchema>;

export const RiskEventSchema = z.object({
  eventId: z.string().min(1),
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  ruleId: RiskRuleIdSchema,
  decision: RiskDecisionSchema,
  requestedAction: z.string().min(1),
  requestedValueUsd: DecimalStringSchema.optional(),
  allowedValueUsd: DecimalStringSchema.optional(),
  threshold: DecimalStringSchema.optional(),
  reason: z.string().min(1).max(500),
  timestamp: TimestampSchema,
});
export type RiskEvent = z.infer<typeof RiskEventSchema>;
