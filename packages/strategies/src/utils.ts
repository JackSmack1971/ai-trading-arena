import { randomUUID } from 'node:crypto';
import type { NormalizedMarketEvent, SignalDirection, StrategyContext, StrategySignal } from './types.js';

export function makeSignal(
  event: NormalizedMarketEvent,
  ctx: StrategyContext,
  signal: SignalDirection,
  confidence: number,
  featuresUsed: string[],
): StrategySignal {
  return {
    signalId: randomUUID(),
    strategyId: ctx.activeStrategy.id,
    strategyVersion: ctx.activeStrategy.version,
    inputEventId: event.eventId,
    symbol: event.symbol,
    signal,
    confidence,
    featuresUsed,
    createdAt: new Date().toISOString(),
  };
}
