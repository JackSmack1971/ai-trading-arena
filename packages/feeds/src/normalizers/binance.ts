import type { NormalizedMarketEvent } from '@arena/core';
import crypto from 'crypto';

export function normalizeBinanceTrade(msg: any): NormalizedMarketEvent {
  const receivedAt = new Date().toISOString();
  const exchangeTimestamp = msg.T ? new Date(msg.T).toISOString() : receivedAt;
  const latencyMs = msg.T ? Date.now() - msg.T : 0;

  return {
    eventId: `binance-${msg.s}-${msg.t || crypto.randomUUID()}`,
    sourceId: 'binance',
    symbol: msg.s,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp,
    receivedAt,
    last: msg.p || undefined,
    close: msg.p || undefined,
    volume: msg.q || undefined,
    latencyMs: latencyMs >= 0 ? latencyMs : 0,
  };
}
