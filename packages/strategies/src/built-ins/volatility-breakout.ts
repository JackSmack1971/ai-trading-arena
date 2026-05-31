import { computeBollingerBands } from '../indicators.js';
import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { makeSignal } from '../utils.js';

const PERIOD = 20;
const STD_MULTIPLIER = 2;

export const volatilityBreakout: Strategy = {
  id: 'volatility-breakout',
  name: 'Volatility Breakout (Bollinger 20,2)',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // no-op
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const bars = ctx.marketState.recentBars;
    if (bars.length < PERIOD) return [];

    const closes = bars.map((b) => parseFloat(b.close));
    const bands = computeBollingerBands(closes, PERIOD, STD_MULTIPLIER);
    if (bands === undefined) return [];

    const lastClose = closes[closes.length - 1];
    if (lastClose === undefined) return [];

    if (lastClose > bands.upper) {
      const pctAbove = (lastClose - bands.upper) / bands.middle;
      const confidence = Math.min(0.9, 0.55 + pctAbove * 5);
      return [makeSignal(event, ctx, 'long', confidence, ['bollinger_upper', 'bollinger_period'])];
    }
    if (lastClose < bands.lower) {
      const pctBelow = (bands.lower - lastClose) / bands.middle;
      const confidence = Math.min(0.9, 0.55 + pctBelow * 5);
      return [makeSignal(event, ctx, 'short', confidence, ['bollinger_lower', 'bollinger_period'])];
    }
    return [];
  },
};
