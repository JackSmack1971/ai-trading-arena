import { computeEma } from '../indicators.js';
import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { makeSignal } from '../utils.js';

const FAST = 9;
const SLOW = 21;
const MIN_BARS = SLOW + 1;

export const momentumBasic: Strategy = {
  id: 'momentum-basic',
  name: 'Momentum Basic (EMA 9/21)',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // no-op
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const bars = ctx.marketState.recentBars;
    if (bars.length < MIN_BARS) return [];

    const closes = bars.map((b) => parseFloat(b.close));
    const ema9 = computeEma(closes, FAST);
    const ema21 = computeEma(closes, SLOW);

    const last = closes.length - 1;
    const fast = ema9[last];
    const slow = ema21[last];
    if (fast === undefined || slow === undefined) return [];

    if (fast > slow) {
      return [makeSignal(event, ctx, 'long', 0.62, ['ema_9', 'ema_21'])];
    }
    if (fast < slow) {
      return [makeSignal(event, ctx, 'short', 0.58, ['ema_9', 'ema_21'])];
    }
    return [];
  },
};
