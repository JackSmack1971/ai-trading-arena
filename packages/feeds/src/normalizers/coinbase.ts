import type { NormalizedMarketEvent } from '@arena/core';
import crypto from 'crypto';

export function normalizeCoinbaseTick(msg: any): NormalizedMarketEvent {
  const receivedAt = new Date().toISOString();
  const exchangeTimestamp = msg.time || receivedAt;
  const latencyMs = msg.time ? Date.now() - new Date(msg.time).getTime() : 0;

  return {
    eventId: `coinbase-${msg.product_id}-${msg.sequence || crypto.randomUUID()}`,
    sourceId: 'coinbase',
    symbol: msg.product_id,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp,
    receivedAt,
    bid: msg.best_bid || undefined,
    ask: msg.best_ask || undefined,
    last: msg.price || undefined,
    volume: msg.volume_24h || undefined,
    open: msg.open_24h || undefined,
    high: msg.high_24h || undefined,
    low: msg.low_24h || undefined,
    close: msg.price || undefined,
    latencyMs: latencyMs >= 0 ? latencyMs : 0,
  };
}
