import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';

export const doNothingBaseline: Strategy = {
  id: 'do-nothing-baseline',
  name: 'Do Nothing Baseline',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // no-op
  },

  onMarketEvent(
    _event: NormalizedMarketEvent,
    _ctx: StrategyContext,
  ): StrategySignal[] {
    return [];
  },
};
