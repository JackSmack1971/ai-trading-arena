import { computeRsi } from '../indicators.js';
import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { makeSignal } from '../utils.js';

const PERIOD = 14;
const MIN_BARS = PERIOD + 1;
const OVERSOLD = 28;
const OVERBOUGHT = 72;

export const meanReversionBasic: Strategy = {
  id: 'mean-reversion-basic',
  name: 'Mean Reversion Basic (RSI 14)',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // no-op
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const bars = ctx.marketState.recentBars;
    if (bars.length < MIN_BARS) return [];

    const closes = bars.map((b) => parseFloat(b.close));
    const rsi = computeRsi(closes, PERIOD);
    if (rsi === undefined) return [];

    if (rsi < OVERSOLD) {
      const confidence = Math.min(0.9, 0.5 + (OVERSOLD - rsi) / 100);
      return [makeSignal(event, ctx, 'long', confidence, ['rsi_14'])];
    }
    if (rsi > OVERBOUGHT) {
      const confidence = Math.min(0.9, 0.5 + (rsi - OVERBOUGHT) / 100);
      return [makeSignal(event, ctx, 'reduce_long', confidence, ['rsi_14'])];
    }
    return [];
  },
};
