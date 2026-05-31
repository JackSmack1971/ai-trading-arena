import { z } from 'zod';
import { AgentIdSchema, NonNegativeDecimalStringSchema, RunIdSchema, StrategyIdSchema, SymbolSchema, TimestampSchema } from './common.js';
import { PaperOrderSchema } from './broker.js';
import { MarketStateSummarySchema, NormalizedMarketEventSchema } from './market.js';
import { PortfolioSummarySchema, TradeSummarySchema } from './broker.js';
import { StrategyDescriptorSchema, StrategySignalSchema } from './strategy.js';
import { RiskStateSchema } from './risk.js';

export const AgentActionNameSchema = z.enum([
  'NOOP',
  'PLACE_MARKET_ORDER',
  'PLACE_LIMIT_ORDER',
  'AMEND_ORDER',
  'CANCEL_ORDER',
  'CLOSE_POSITION',
  'SWITCH_STRATEGY',
  'REDUCE_EXPOSURE',
]);
export type AgentActionName = z.infer<typeof AgentActionNameSchema>;

export const AgentDecisionThesisSchema = z.object({
  summary: z.string().min(1).max(1000),
  evidence: z.array(z.string().max(500)).max(10),
  invalidation: z.string().min(1).max(500),
  expectedHoldingPeriod: z.string().min(1).max(100),
});
export type AgentDecisionThesis = z.infer<typeof AgentDecisionThesisSchema>;

export const AgentDecisionRiskSchema = z.object({
  maxLossUsd: NonNegativeDecimalStringSchema,
  stopPrice: NonNegativeDecimalStringSchema.optional(),
  takeProfitPrice: NonNegativeDecimalStringSchema.optional(),
});
export type AgentDecisionRisk = z.infer<typeof AgentDecisionRiskSchema>;

export const AgentDecisionSchema = z.object({
  action: AgentActionNameSchema,
  symbol: SymbolSchema.optional(),
  side: z.enum(['BUY', 'SELL']).optional(),
  quantityUsd: NonNegativeDecimalStringSchema.optional(),
  limitPrice: NonNegativeDecimalStringSchema.optional(),
  orderId: z.string().min(1).optional(),
  newStrategyId: StrategyIdSchema.optional(),
  confidence: z.number().min(0).max(1),
  thesis: AgentDecisionThesisSchema,
  risk: AgentDecisionRiskSchema,
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export const AgentObservationSchema = z.object({
  observationId: z.string().min(1),
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  timestamp: TimestampSchema,
  marketState: MarketStateSummarySchema,
  portfolio: PortfolioSummarySchema,
  openOrders: z.array(PaperOrderSchema).max(50),
  recentSignals: z.array(StrategySignalSchema).max(20),
  recentTrades: z.array(TradeSummarySchema).max(20),
  riskState: RiskStateSchema,
  allowedActions: z.array(AgentActionNameSchema).min(1),
  allowedStrategies: z.array(StrategyDescriptorSchema).max(20),
});
export type AgentObservation = z.infer<typeof AgentObservationSchema>;

export const AgentConfigSchema = z.object({
  agentId: AgentIdSchema,
  name: z.string().min(1).max(100),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive().max(4096),
  decisionCadenceMs: z.number().int().positive(),
  systemPrompt: z.string().max(4000).optional(),
  startingBalanceUsd: NonNegativeDecimalStringSchema,
  allowedStrategies: z.array(StrategyIdSchema).min(1),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
