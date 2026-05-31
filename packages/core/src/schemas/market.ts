import { z } from 'zod';
import {
  DecimalStringSchema,
  NonNegativeDecimalStringSchema,
  PositiveDecimalStringSchema,
  SymbolSchema,
  TimestampSchema,
} from './common.js';

export const RawMarketEventTypeSchema = z.enum([
  'tick',
  'orderbook',
  'bar',
  'trade',
  'status',
]);
export type RawMarketEventType = z.infer<typeof RawMarketEventTypeSchema>;

export const MarketEventSchema = z.object({
  provider: z.string().min(1),
  symbol: SymbolSchema,
  eventType: RawMarketEventTypeSchema,
  timestamp: TimestampSchema,
  rawPayload: z.unknown(),
});
export type MarketEvent = z.infer<typeof MarketEventSchema>;

export const NormalizedEventTypeSchema = z.enum([
  'MARKET_TICK_RECEIVED',
  'ORDERBOOK_UPDATED',
  'BAR_CLOSED',
  'TRADE_EXECUTED',
  'FEED_STATUS_CHANGED',
]);
export type NormalizedEventType = z.infer<typeof NormalizedEventTypeSchema>;

export const NormalizedMarketEventSchema = z.object({
  eventId: z.string().min(1),
  sourceId: z.string().min(1),
  symbol: SymbolSchema,
  eventType: NormalizedEventTypeSchema,
  exchangeTimestamp: TimestampSchema,
  receivedAt: TimestampSchema,
  bid: NonNegativeDecimalStringSchema.optional(),
  ask: NonNegativeDecimalStringSchema.optional(),
  last: NonNegativeDecimalStringSchema.optional(),
  volume: NonNegativeDecimalStringSchema.optional(),
  open: NonNegativeDecimalStringSchema.optional(),
  high: NonNegativeDecimalStringSchema.optional(),
  low: NonNegativeDecimalStringSchema.optional(),
  close: NonNegativeDecimalStringSchema.optional(),
  latencyMs: z.number().int().nonnegative().optional(),
});
export type NormalizedMarketEvent = z.infer<typeof NormalizedMarketEventSchema>;

export const BarDataSchema = z.object({
  time: z.number().int().positive(),
  open: NonNegativeDecimalStringSchema,
  high: NonNegativeDecimalStringSchema,
  low: NonNegativeDecimalStringSchema,
  close: NonNegativeDecimalStringSchema,
  volume: NonNegativeDecimalStringSchema,
});
export type BarData = z.infer<typeof BarDataSchema>;

export const OrderBookLevelSchema = z.object({
  price: PositiveDecimalStringSchema,
  quantity: PositiveDecimalStringSchema,
});
export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;

export const OrderBookSummarySchema = z.object({
  symbol: SymbolSchema,
  timestamp: TimestampSchema,
  bids: z.array(OrderBookLevelSchema).max(20),
  asks: z.array(OrderBookLevelSchema).max(20),
  totalBidDepth: NonNegativeDecimalStringSchema,
  totalAskDepth: NonNegativeDecimalStringSchema,
  imbalance: DecimalStringSchema,
});
export type OrderBookSummary = z.infer<typeof OrderBookSummarySchema>;

export const MarketStateSummarySchema = z.object({
  symbol: SymbolSchema,
  bid: NonNegativeDecimalStringSchema,
  ask: NonNegativeDecimalStringSchema,
  last: NonNegativeDecimalStringSchema,
  spreadBps: NonNegativeDecimalStringSchema,
  volume24h: NonNegativeDecimalStringSchema,
  priceChange24hPct: DecimalStringSchema,
  recentBars: z.array(BarDataSchema).max(100),
  orderBook: OrderBookSummarySchema.optional(),
  lastUpdatedAt: TimestampSchema,
});
export type MarketStateSummary = z.infer<typeof MarketStateSummarySchema>;
