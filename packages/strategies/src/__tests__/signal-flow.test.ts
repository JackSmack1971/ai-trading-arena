import { describe, expect, it } from 'vitest';
import { StrategyExecutor } from '../executor.js';
import { StrategySignalSchema } from '../schemas.js';
import { STRATEGY_SIGNAL_CREATED_TYPE, toStrategySignalEvent } from '../signal-events.js';
import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { makeEvent, makePortfolio } from './fixtures.js';

function makeAlwaysLongStrategy(id = 'always-long'): Strategy {
  return {
    id,
    name: 'Always Long',
    version: '0.1.0',
    onStart(_ctx: StrategyContext) {},
    onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
      return [{
        signalId: `sig-${event.eventId}`,
        strategyId: ctx.activeStrategy.id,
        strategyVersion: ctx.activeStrategy.version,
        inputEventId: event.eventId,
        symbol: event.symbol,
        signal: 'long',
        confidence: 0.8,
        featuresUsed: ['test'],
        createdAt: event.receivedAt,
      }];
    },
  };
}

describe('signal flow integration', () => {
  it('captures executor output as schema-valid STRATEGY_SIGNAL_CREATED events', async () => {
    const executor = new StrategyExecutor(makePortfolio('agent-1'));
    executor.registerStrategy('agent-1', makeAlwaysLongStrategy());

    const signals = await executor.processMarketEvent(makeEvent('BTC-USD'));
    const captured: Array<ReturnType<typeof toStrategySignalEvent>> = [];

    for (const signal of signals) {
      captured.push(toStrategySignalEvent(signal));
    }

    expect(captured).toHaveLength(signals.length);
    expect(captured.every((event) => event.type === STRATEGY_SIGNAL_CREATED_TYPE)).toBe(true);
    expect(StrategySignalSchema.safeParse(captured[0]!.payload).success).toBe(true);
  });

  it('preserves deterministic stable fields across identical runs', async () => {
    const event = makeEvent('BTC-USD');

    const run = async () => {
      const executor = new StrategyExecutor(makePortfolio('agent-1'));
      executor.registerStrategy('agent-1', makeAlwaysLongStrategy());
      return (await executor.processMarketEvent(event)).map((signal) =>
        toStrategySignalEvent(signal),
      );
    };

    const run1 = await run();
    const run2 = await run();

    expect(
      run1.map((entry) => ({
        type: entry.type,
        signal: entry.payload.signal,
        symbol: entry.payload.symbol,
        strategyId: entry.payload.strategyId,
      })),
    ).toEqual(
      run2.map((entry) => ({
        type: entry.type,
        signal: entry.payload.signal,
        symbol: entry.payload.symbol,
        strategyId: entry.payload.strategyId,
      })),
    );
  });
});
