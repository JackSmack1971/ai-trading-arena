import { z } from 'zod';
import type { NormalizedMarketEvent } from '@arena/core';
import crypto from 'crypto';

export const CoinbaseTickInputSchema = z
  .object({
    type: z.literal('ticker'),
    product_id: z.string().min(1),
    sequence: z.union([z.number(), z.string()]).optional(),
    time: z.string().optional(),
    best_bid: z.string().optional(),
    best_ask: z.string().optional(),
    price: z.string().optional(),
    volume_24h: z.string().optional(),
    open_24h: z.string().optional(),
    high_24h: z.string().optional(),
    low_24h: z.string().optional(),
  })
  .passthrough();

export function normalizeCoinbaseTick(msg: unknown): NormalizedMarketEvent | null {
  const parsed = CoinbaseTickInputSchema.safeParse(msg);
  if (!parsed.success) {
    return null;
  }
  const data = parsed.data;

  const receivedAt = new Date().toISOString();
  const exchangeTimestamp = data.time || receivedAt;
  const latencyMs = data.time ? Date.now() - new Date(data.time).getTime() : 0;

  return {
    eventId: `coinbase-${data.product_id}-${data.sequence || crypto.randomUUID()}`,
    sourceId: 'coinbase',
    symbol: data.product_id,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp,
    receivedAt,
    bid: data.best_bid || undefined,
    ask: data.best_ask || undefined,
    last: data.price || undefined,
    volume: data.volume_24h || undefined,
    open: data.open_24h || undefined,
    high: data.high_24h || undefined,
    low: data.low_24h || undefined,
    close: data.price || undefined,
    latencyMs: latencyMs >= 0 ? latencyMs : 0,
  };
}
