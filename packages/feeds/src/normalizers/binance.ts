import { z } from 'zod';
import type { NormalizedMarketEvent } from '@arena/core';
import crypto from 'crypto';

export const BinanceTradeInputSchema = z
  .object({
    e: z.literal('trade'),
    s: z.string().min(1),
    t: z.union([z.number(), z.string()]).optional(),
    T: z.number().optional(),
    p: z.string().optional(),
    q: z.string().optional(),
  })
  .passthrough();

export function normalizeBinanceTrade(msg: unknown): NormalizedMarketEvent | null {
  const parsed = BinanceTradeInputSchema.safeParse(msg);
  if (!parsed.success) {
    return null;
  }
  const data = parsed.data;

  const receivedAt = new Date().toISOString();
  const exchangeTimestamp = data.T ? new Date(data.T).toISOString() : receivedAt;
  const latencyMs = data.T ? Date.now() - data.T : 0;

  return {
    eventId: `binance-${data.s}-${data.t || crypto.randomUUID()}`,
    sourceId: 'binance',
    symbol: data.s,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp,
    receivedAt,
    last: data.p || undefined,
    close: data.p || undefined,
    volume: data.q || undefined,
    latencyMs: latencyMs >= 0 ? latencyMs : 0,
  };
}
