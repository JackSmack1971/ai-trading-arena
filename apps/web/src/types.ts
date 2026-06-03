import { z } from 'zod';

export const TelemetrySchema = z.object({
  runId: z.string(),
  eventCount: z.number(),
  hashChainValid: z.boolean(),
  marketTicks: z.array(z.object({ timestamp: z.string(), symbol: z.string(), price: z.string() })),
  equity: z.array(z.object({ timestamp: z.string(), agentId: z.string(), equity: z.string(), cashBalance: z.string(), exposurePct: z.string() })),
  latestEvents: z.array(z.object({ seq: z.number(), type: z.string(), source: z.string(), timestamp: z.string(), payload: z.unknown() })),
  eventTypeCounts: z.record(z.string(), z.number()),
  agents: z.array(z.object({ agentId: z.string(), latestEquity: z.string(), latestCashBalance: z.string(), latestExposurePct: z.string(), filledOrders: z.number(), lastDecisionSummary: z.string() })),
});

export const TelemetryWsEnvelopeSchema = z.object({ type: z.literal('telemetry.snapshot'), data: TelemetrySchema });
export const TelemetryHttpEnvelopeSchema = z.object({ ok: z.literal(true), data: TelemetrySchema });
export type ArenaTelemetry = z.infer<typeof TelemetrySchema>;
export type WsStatus = 'connecting' | 'open' | 'degraded' | 'reconnecting' | 'closed';
