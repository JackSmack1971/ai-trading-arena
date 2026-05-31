// Test Strategy — signal-only strategy (no order emission permitted).
// Edit onMarketEvent to emit typed signals based on market conditions.
// Import only allowed helpers: indicator math, ctx.marketState, ctx.portfolio.

import type {
  NormalizedMarketEvent,
  Strategy,
  StrategyContext,
  StrategySignal,
} from '../../packages/strategies/src/types.js';

const ID = 'test-strategy';
const VERSION = '0.1.0';

export const TestStrategy: Strategy = {
  id: ID,
  name: 'Test Strategy',
  version: VERSION,

  onStart(_ctx: StrategyContext): void {
    // Called once when the strategy is activated. Set up any state here.
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const bars = ctx.marketState.recentBars;

    // Replace this with real signal logic.
    // Return [] to emit no signal (equivalent to NOOP for this tick).
    void bars;
    void event;
    return [];
  },
};

export default TestStrategy;
