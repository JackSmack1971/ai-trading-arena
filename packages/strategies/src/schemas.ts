import { z } from 'zod';

export const StrategyManifestPermissionsSchema = z.object({
  network: z.literal(false),
  filesystem: z.literal(false),
  can_emit_orders: z.literal(false),
  can_emit_signals: z.boolean(),
});

export const StrategyManifestSchema = z.object({
  id: z.string().min(1, 'Strategy id required').max(64),
  name: z.string().min(1).max(100),
  version: z.string().min(1),
  entry: z.string().min(1),
  permissions: StrategyManifestPermissionsSchema,
  inputs: z.record(z.string(), z.unknown()).optional(),
});

export type StrategyInputsSchema = z.ZodType<Record<string, unknown>>;

export const StrategySignalSchema = z.object({
  signalId: z.string().min(1),
  strategyId: z.string().min(1),
  strategyVersion: z.string().min(1),
  inputEventId: z.string().min(1),
  symbol: z.string().min(1).max(32),
  signal: z.enum(['long', 'short', 'reduce_long', 'reduce_short', 'close', 'none']),
  confidence: z.number().min(0).max(1),
  featuresUsed: z.array(z.string()).max(50),
  createdAt: z.string().datetime(),
});
