import { z } from 'zod';
import { EventIdSchema, RunIdSchema, TimestampSchema } from '../schemas/common.js';
import { AgentDecisionSchema } from '../schemas/agent.js';
import { NormalizedMarketEventSchema } from '../schemas/market.js';
import { PaperFillSchema, PaperOrderSchema, PnLSnapshotSchema, PositionSchema } from '../schemas/broker.js';
import { RiskEventSchema } from '../schemas/risk.js';
import { StrategySignalSchema } from '../schemas/strategy.js';

export const SimEventTypeSchema = z.enum([
  'MARKET_TICK_RECEIVED',
  'ORDERBOOK_UPDATED',
  'BAR_CLOSED',
  'STRATEGY_SIGNAL_CREATED',
  'AGENT_DECISION_REQUESTED',
  'AGENT_DECISION_RECEIVED',
  'AGENT_DECISION_INVALID',
  'RISK_CHECK_PASSED',
  'RISK_CHECK_REJECTED',
  'PAPER_ORDER_CREATED',
  'PAPER_ORDER_AMENDED',
  'PAPER_ORDER_CANCELLED',
  'PAPER_ORDER_REJECTED',
  'PAPER_ORDER_FILLED',
  'POSITION_UPDATED',
  'PNL_SNAPSHOT_CREATED',
  'STRATEGY_SWITCHED',
  'RATE_LIMIT_DELAYED',
  'FEED_DISCONNECTED',
  'FEED_RECONNECTED',
]);
export type SimEventType = z.infer<typeof SimEventTypeSchema>;

// Base append-only event — maps to the `events` SQLite table.
export const SimEventSchema = z.object({
  id: EventIdSchema,
  runId: RunIdSchema,
  seq: z.number().int().nonnegative(),
  type: SimEventTypeSchema,
  source: z.string().min(1),
  timestamp: TimestampSchema,
  payload: z.unknown(),
  payloadHash: z.string().min(1),
  previousHash: z.string().min(1).optional(),
  createdAt: TimestampSchema,
});
export type SimEvent = z.infer<typeof SimEventSchema>;

// Typed payload schemas per event type.
export const MarketTickPayloadSchema = NormalizedMarketEventSchema;
export type MarketTickPayload = z.infer<typeof MarketTickPayloadSchema>;

export const StrategySignalPayloadSchema = StrategySignalSchema;
export type StrategySignalPayload = z.infer<typeof StrategySignalPayloadSchema>;

export const AgentDecisionRequestedPayloadSchema = z.object({
  observationId: z.string().min(1),
  agentId: z.string().min(1),
  triggerReason: z.string().min(1),
});
export type AgentDecisionRequestedPayload = z.infer<typeof AgentDecisionRequestedPayloadSchema>;

export const AgentDecisionReceivedPayloadSchema = z.object({
  observationId: z.string().min(1),
  decisionId: z.string().min(1),
  agentId: z.string().min(1),
  decision: AgentDecisionSchema,
  schemaValid: z.boolean(),
  repairAttempted: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
});
export type AgentDecisionReceivedPayload = z.infer<typeof AgentDecisionReceivedPayloadSchema>;

export const AgentDecisionInvalidPayloadSchema = z.object({
  observationId: z.string().min(1),
  agentId: z.string().min(1),
  rawResponseHash: z.string().min(1),
  parseError: z.string(),
  repairAttempted: z.boolean(),
});
export type AgentDecisionInvalidPayload = z.infer<typeof AgentDecisionInvalidPayloadSchema>;

export const RiskCheckPayloadSchema = RiskEventSchema;
export type RiskCheckPayload = z.infer<typeof RiskCheckPayloadSchema>;

export const PaperOrderPayloadSchema = PaperOrderSchema;
export type PaperOrderPayload = z.infer<typeof PaperOrderPayloadSchema>;

export const PaperFillPayloadSchema = PaperFillSchema;
export type PaperFillPayload = z.infer<typeof PaperFillPayloadSchema>;

export const PositionUpdatedPayloadSchema = PositionSchema;
export type PositionUpdatedPayload = z.infer<typeof PositionUpdatedPayloadSchema>;

export const PnLSnapshotPayloadSchema = PnLSnapshotSchema;
export type PnLSnapshotPayload = z.infer<typeof PnLSnapshotPayloadSchema>;

export const StrategySwitchedPayloadSchema = z.object({
  agentId: z.string().min(1),
  fromStrategyId: z.string().min(1),
  toStrategyId: z.string().min(1),
  reason: z.string().min(1),
});
export type StrategySwitchedPayload = z.infer<typeof StrategySwitchedPayloadSchema>;

export const RateLimitDelayedPayloadSchema = z.object({
  provider: z.string().min(1),
  operation: z.string().min(1),
  delayMs: z.number().int().nonnegative(),
  retryAttempt: z.number().int().nonnegative(),
});
export type RateLimitDelayedPayload = z.infer<typeof RateLimitDelayedPayloadSchema>;

export const FeedConnectionPayloadSchema = z.object({
  sourceId: z.string().min(1),
  provider: z.string().min(1),
  symbols: z.array(z.string()),
  reason: z.string().optional(),
  reconnectAttempt: z.number().int().nonnegative().optional(),
});
export type FeedConnectionPayload = z.infer<typeof FeedConnectionPayloadSchema>;
