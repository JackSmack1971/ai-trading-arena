import type { NormalizedMarketEvent, Strategy, StrategyContext, StrategySignal } from '../types.js';
import { makeSignal } from '../utils.js';

const THRESHOLD = 0.20;

export const orderbookImbalance: Strategy = {
  id: 'orderbook-imbalance',
  name: 'Order Book Imbalance',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // no-op
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const ob = ctx.marketState.orderBook;
    if (ob === undefined) return [];

    const imbalance = parseFloat(ob.imbalance);
    if (Number.isNaN(imbalance)) return [];

    if (imbalance > THRESHOLD) {
      const confidence = Math.min(0.9, 0.5 + imbalance / 2);
      return [makeSignal(event, ctx, 'long', confidence, ['orderbook_imbalance'])];
    }
    if (imbalance < -THRESHOLD) {
      const confidence = Math.min(0.9, 0.5 + Math.abs(imbalance) / 2);
      return [makeSignal(event, ctx, 'short', confidence, ['orderbook_imbalance'])];
    }
    return [];
  },
};
