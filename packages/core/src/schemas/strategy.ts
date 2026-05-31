import { z } from 'zod';
import { DecimalStringSchema, NonNegativeDecimalStringSchema, SignalIdSchema, StrategyIdSchema, SymbolSchema, TimestampSchema } from './common.js';

export const SignalDirectionSchema = z.enum([
  'long',
  'short',
  'reduce_long',
  'reduce_short',
  'close',
  'none',
]);
export type SignalDirection = z.infer<typeof SignalDirectionSchema>;

export const StrategySignalSchema = z.object({
  signalId: SignalIdSchema,
  strategyId: StrategyIdSchema,
  strategyVersion: z.string().min(1),
  inputEventId: z.string().min(1),
  symbol: SymbolSchema,
  signal: SignalDirectionSchema,
  confidence: z.number().min(0).max(1),
  featuresUsed: z.array(z.string()).max(50),
  createdAt: TimestampSchema,
});
export type StrategySignal = z.infer<typeof StrategySignalSchema>;

export const StrategyDescriptorSchema = z.object({
  id: StrategyIdSchema,
  name: z.string().min(1).max(100),
  version: z.string().min(1),
  description: z.string().max(500).optional(),
});
export type StrategyDescriptor = z.infer<typeof StrategyDescriptorSchema>;

export const StrategyManifestPermissionsSchema = z.object({
  network: z.literal(false),
  filesystem: z.literal(false),
  can_emit_orders: z.literal(false),
  can_emit_signals: z.boolean(),
});
export type StrategyManifestPermissions = z.infer<typeof StrategyManifestPermissionsSchema>;

export const StrategyManifestSchema = z.object({
  id: StrategyIdSchema,
  name: z.string().min(1).max(100),
  version: z.string().min(1),
  entry: z.string().min(1),
  permissions: StrategyManifestPermissionsSchema,
});
export type StrategyManifest = z.infer<typeof StrategyManifestSchema>;

export const StrategyRiskConfigSchema = z.object({
  maxPositionPct: NonNegativeDecimalStringSchema,
});
export type StrategyRiskConfig = z.infer<typeof StrategyRiskConfigSchema>;

export const StrategySignalRuleSchema = z.object({
  when: z.record(z.string(), z.unknown()),
  emit: z.object({
    signal: SignalDirectionSchema,
    confidence: z.number().min(0).max(1),
  }),
});
export type StrategySignalRule = z.infer<typeof StrategySignalRuleSchema>;

export const StrategyDslSchema = z.object({
  id: StrategyIdSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  inputs: z.object({
    symbols: z.array(SymbolSchema).min(1),
    timeframe: z.string().min(1),
  }),
  rules: z.array(StrategySignalRuleSchema).min(1),
  risk: StrategyRiskConfigSchema,
});
export type StrategyDsl = z.infer<typeof StrategyDslSchema>;

export const PositionUpdateSchema = z.object({
  agentId: z.string().min(1),
  symbol: SymbolSchema,
  side: z.enum(['LONG', 'SHORT']),
  quantity: NonNegativeDecimalStringSchema,
  averageEntryPrice: NonNegativeDecimalStringSchema,
  currentPrice: NonNegativeDecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  trigger: z.enum(['FILL', 'PRICE_UPDATE', 'MANUAL']),
  timestamp: TimestampSchema,
});
export type PositionUpdate = z.infer<typeof PositionUpdateSchema>;
