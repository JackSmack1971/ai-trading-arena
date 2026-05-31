import { z } from 'zod';

export const FeedCapabilitySchema = z.enum([
  'TICKER',
  'ORDERBOOK',
  'TRADES',
  'BARS',
  'FUNDING_RATE',
]);
export type FeedCapability = z.infer<typeof FeedCapabilitySchema>;

export const RateLimitScopeSchema = z.enum([
  'connection',
  'subscription',
  'request',
  'message',
]);
export type RateLimitScope = z.infer<typeof RateLimitScopeSchema>;

export const RateLimitSchema = z.object({
  scope: RateLimitScopeSchema,
  max: z.number().int().positive(),
  intervalMs: z.number().int().positive(),
});
export type RateLimit = z.infer<typeof RateLimitSchema>;

export const RatePolicySchema = z.object({
  provider: z.string().min(1),
  limits: z.array(RateLimitSchema).min(1),
  backoff: z.object({
    initialMs: z.number().int().positive(),
    maxMs: z.number().int().positive(),
    jitter: z.boolean(),
  }),
});
export type RatePolicy = z.infer<typeof RatePolicySchema>;

export const MarketTypeSchema = z.enum(['crypto', 'prediction', 'dex']);
export type MarketType = z.infer<typeof MarketTypeSchema>;

export const InstrumentSchema = z.object({
  symbol: z.string().min(1).max(32),
  baseAsset: z.string().min(1),
  quoteAsset: z.string().min(1),
  pricePrecision: z.number().int().min(0),
  quantityPrecision: z.number().int().min(0),
  minOrderSizeUsd: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid positive decimal'),
  market: MarketTypeSchema,
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const FeedConfigSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1),
  maxReconnectAttempts: z.number().int().positive().optional(),
  reconnectDelayMs: z.number().int().positive().optional(),
});
export type FeedConfig = z.infer<typeof FeedConfigSchema>;
