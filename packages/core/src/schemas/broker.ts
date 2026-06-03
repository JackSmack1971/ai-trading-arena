import { z } from 'zod';
import {
  AgentIdSchema,
  DecimalStringSchema,
  FillIdSchema,
  NonNegativeDecimalStringSchema,
  OrderIdSchema,
  RunIdSchema,
  SymbolSchema,
  StrategyIdSchema,
  TimestampSchema,
} from './common.js';

export const OrderTypeSchema = z.enum([
  'MARKET',
  'LIMIT',
  'STOP',
  'STOP_LIMIT',
  'TRAILING_STOP',
]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderStatusSchema = z.enum([
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaperOrderSchema = z.object({
  orderId: OrderIdSchema,
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  orderType: OrderTypeSchema,
  side: OrderSideSchema,
  quantityUsd: NonNegativeDecimalStringSchema,
  limitPrice: NonNegativeDecimalStringSchema.optional(),
  stopPrice: NonNegativeDecimalStringSchema.optional(),
  status: OrderStatusSchema,
  filledQuantityUsd: NonNegativeDecimalStringSchema,
  averageFillPrice: NonNegativeDecimalStringSchema.optional(),
  decisionId: z.string().min(1).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PaperOrder = z.infer<typeof PaperOrderSchema>;

export const PaperFillSchema = z.object({
  fillId: FillIdSchema,
  orderId: OrderIdSchema,
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  side: OrderSideSchema,
  quantity: NonNegativeDecimalStringSchema,
  price: NonNegativeDecimalStringSchema,
  fee: NonNegativeDecimalStringSchema,
  slippageBps: NonNegativeDecimalStringSchema,
  liquiditySource: z.string().min(1),
  timestamp: TimestampSchema,
});
export type PaperFill = z.infer<typeof PaperFillSchema>;

export const PositionSideSchema = z.enum(['LONG', 'SHORT']);
export type PositionSide = z.infer<typeof PositionSideSchema>;

export const PositionSchema = z.object({
  positionId: z.string().min(1),
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  side: PositionSideSchema,
  quantity: NonNegativeDecimalStringSchema,
  averageEntryPrice: NonNegativeDecimalStringSchema,
  currentPrice: NonNegativeDecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  realizedPnl: DecimalStringSchema,
  openedAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Position = z.infer<typeof PositionSchema>;

export const PnLSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  timestamp: TimestampSchema,
  equity: NonNegativeDecimalStringSchema,
  cashBalance: DecimalStringSchema,
  positionValue: NonNegativeDecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  realizedPnl: DecimalStringSchema,
  totalReturnPct: DecimalStringSchema,
  maxDrawdownPct: NonNegativeDecimalStringSchema,
  totalFeesPaid: NonNegativeDecimalStringSchema,
  totalSlippagePaid: NonNegativeDecimalStringSchema,
  tradeCount: z.number().int().nonnegative(),
});
export type PnLSnapshot = z.infer<typeof PnLSnapshotSchema>;

export const TradeSummarySchema = z.object({
  tradeId: z.string().min(1),
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  side: OrderSideSchema,
  quantityUsd: NonNegativeDecimalStringSchema,
  fillPrice: NonNegativeDecimalStringSchema,
  fee: NonNegativeDecimalStringSchema,
  realizedPnl: DecimalStringSchema.optional(),
  timestamp: TimestampSchema,
});
export type TradeSummary = z.infer<typeof TradeSummarySchema>;

export const PortfolioSummarySchema = z.object({
  agentId: AgentIdSchema,
  cashBalance: DecimalStringSchema,
  equity: NonNegativeDecimalStringSchema,
  totalPositionValue: NonNegativeDecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  realizedPnl: DecimalStringSchema,
  exposurePct: NonNegativeDecimalStringSchema,
  currentDrawdownPct: NonNegativeDecimalStringSchema,
  snapshotAt: TimestampSchema,
});
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;


export const PositionSnapshotSchema = z.object({
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  side: PositionSideSchema,
  quantity: NonNegativeDecimalStringSchema,
  averageEntryPrice: NonNegativeDecimalStringSchema,
  currentPrice: NonNegativeDecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  realizedPnl: DecimalStringSchema.default('0.00000000'),
  updatedAt: TimestampSchema,
});
export type PositionSnapshot = z.infer<typeof PositionSnapshotSchema>;

export const PnLSummarySchema = z.object({
  runId: RunIdSchema,
  realizedPnl: DecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  totalFees: NonNegativeDecimalStringSchema,
  netPnl: DecimalStringSchema,
  returnPct: DecimalStringSchema,
});
export type PnLSummary = z.infer<typeof PnLSummarySchema>;

export const OrderRecordSchema = z.object({
  orderId: OrderIdSchema,
  agentId: AgentIdSchema,
  symbol: SymbolSchema,
  side: OrderSideSchema,
  type: OrderTypeSchema,
  quantity: NonNegativeDecimalStringSchema,
  limitPrice: NonNegativeDecimalStringSchema.optional(),
  status: OrderStatusSchema,
  fillPrice: NonNegativeDecimalStringSchema.optional(),
  fillQuantity: NonNegativeDecimalStringSchema.optional(),
  fee: NonNegativeDecimalStringSchema.optional(),
  placedAt: TimestampSchema,
  filledAt: TimestampSchema.optional(),
  cancelledAt: TimestampSchema.optional(),
});
export type OrderRecord = z.infer<typeof OrderRecordSchema>;

export const OrderHistoryPageSchema = z.object({
  orders: z.array(OrderRecordSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
export type OrderHistoryPage = z.infer<typeof OrderHistoryPageSchema>;

export const AgentTelemetrySnapshotSchema = z.object({
  runId: RunIdSchema,
  decisionsTotal: z.number().int().nonnegative(),
  decisionsSucceeded: z.number().int().nonnegative(),
  decisionsFailed: z.number().int().nonnegative(),
  noopCount: z.number().int().nonnegative(),
  lastDecisionAt: TimestampSchema.optional(),
  currentStrategy: StrategyIdSchema.optional(),
  strategyHistory: z.array(z.object({ strategyId: StrategyIdSchema, requestedAt: TimestampSchema, agentId: AgentIdSchema.optional() })),
});
export type AgentTelemetrySnapshot = z.infer<typeof AgentTelemetrySnapshotSchema>;
