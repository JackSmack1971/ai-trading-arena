import { z } from 'zod';
import { RunIdSchema } from '@arena/core';

export const DEFAULT_RUN_ID = 'demo-local-paper-arena';
export const ALLOWED_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';

export const RunQuerySchema = z.object({
  runId: RunIdSchema.default(DEFAULT_RUN_ID),
});

export const RunParamsSchema = z.object({
  runId: RunIdSchema,
});

export const HealthDataSchema = z.object({
  ok: z.literal(true),
  service: z.literal('arena-api'),
});

export const ChartPointSchema = z.object({
  timestamp: z.string().datetime(),
  symbol: z.string().min(1),
  price: z.string().min(1),
});

export const EquityPointSchema = z.object({
  timestamp: z.string().datetime(),
  agentId: z.string().min(1),
  equity: z.string().min(1),
  cashBalance: z.string().min(1),
  exposurePct: z.string().min(1),
});

export const AgentTelemetrySchema = z.object({
  agentId: z.string().min(1),
  latestEquity: z.string().min(1),
  latestCashBalance: z.string().min(1),
  latestExposurePct: z.string().min(1),
  filledOrders: z.number().int().nonnegative(),
  lastDecisionSummary: z.string().min(1),
});

export const EventEnvelopeSchema = z.object({
  seq: z.number().int().nonnegative(),
  type: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.unknown(),
});

export const ArenaTelemetrySchema = z.object({
  runId: RunIdSchema,
  eventCount: z.number().int().nonnegative(),
  hashChainValid: z.boolean(),
  marketTicks: z.array(ChartPointSchema),
  equity: z.array(EquityPointSchema),
  latestEvents: z.array(EventEnvelopeSchema),
  eventTypeCounts: z.record(z.string(), z.number().int().nonnegative()),
  agents: z.array(AgentTelemetrySchema),
});

export const RunSummarySchema = z.object({
  runId: RunIdSchema,
  eventCount: z.number().int().nonnegative(),
  hashChainValid: z.boolean(),
  eventTypeCounts: z.record(z.string(), z.number().int().nonnegative()),
  agents: z.array(AgentTelemetrySchema),
});

export const DemoAgentSummarySchema = z.object({
  agentId: z.string().min(1),
  equity: z.string().min(1),
  cashBalance: z.string().min(1),
  totalPositionValue: z.string().min(1),
  tradeCount: z.number().int().nonnegative(),
});

export const DemoRunResultSchema = z.object({
  runId: RunIdSchema,
  eventCount: z.number().int().nonnegative(),
  hashChainValid: z.boolean(),
  agents: z.array(DemoAgentSummarySchema),
});

export const DemoRunCreatedSchema = z.object({
  status: z.literal('created'),
  run: DemoRunResultSchema,
});

export const DemoRunAlreadyExistsSchema = z.object({
  status: z.literal('already_exists'),
  telemetry: ArenaTelemetrySchema,
});

export const DemoRunStoppedSchema = z.object({
  status: z.literal('stopped'),
  runId: RunIdSchema,
  message: z.literal('No live simulator loop was running; append-only events were preserved.'),
});

export const ApiErrorDataSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  issues: z.unknown().optional(),
});

export function okEnvelope<const T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ ok: z.literal(true), data: dataSchema });
}

export const ErrorEnvelopeSchema = z.object({ ok: z.literal(false), error: ApiErrorDataSchema });
export const HealthEnvelopeSchema = okEnvelope(HealthDataSchema);
export const TelemetryEnvelopeSchema = okEnvelope(ArenaTelemetrySchema);
export const EventsEnvelopeSchema = okEnvelope(z.array(EventEnvelopeSchema));
export const SummaryEnvelopeSchema = okEnvelope(RunSummarySchema);
export const DemoRunEnvelopeSchema = okEnvelope(z.union([DemoRunCreatedSchema, DemoRunAlreadyExistsSchema]));
export const DemoStopEnvelopeSchema = okEnvelope(DemoRunStoppedSchema);
export const TelemetryWsEnvelopeSchema = z.object({
  type: z.literal('telemetry.snapshot'),
  data: ArenaTelemetrySchema,
});

export type ArenaTelemetry = z.infer<typeof ArenaTelemetrySchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type DemoRunResult = z.infer<typeof DemoRunResultSchema>;
