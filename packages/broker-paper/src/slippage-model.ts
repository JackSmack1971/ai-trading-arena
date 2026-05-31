import { MoneyDecimal } from './money/decimal.js';
import type { OrderSide } from './types.js';

export interface SlippageResult {
  fillPrice: MoneyDecimal;
  slippageBps: MoneyDecimal;
}

export interface SlippageModel {
  computeSlippage(params: { side: OrderSide; bid: MoneyDecimal; ask: MoneyDecimal }): SlippageResult;
}

export interface SpreadSlippageConfig {
  additionalSlippageBps: string;
}

export const DEFAULT_SLIPPAGE_CONFIG: SpreadSlippageConfig = {
  additionalSlippageBps: '0',
};

export class SpreadSlippageModel implements SlippageModel {
  private readonly additionalBps: MoneyDecimal;

  constructor(config: SpreadSlippageConfig = DEFAULT_SLIPPAGE_CONFIG) {
    this.additionalBps = new MoneyDecimal(config.additionalSlippageBps);
  }

  computeSlippage({ side, bid, ask }: { side: OrderSide; bid: MoneyDecimal; ask: MoneyDecimal }): SlippageResult {
    const mid = bid.plus(ask).div('2');

    if (side === 'BUY') {
      const additionalAmount = mid.times(this.additionalBps).div('10000');
      const fillPrice = ask.plus(additionalAmount);
      const slippageBps = fillPrice.minus(mid).div(mid).times('10000');
      return { fillPrice, slippageBps };
    } else {
      const additionalAmount = mid.times(this.additionalBps).div('10000');
      const fillPrice = bid.minus(additionalAmount);
      const slippageBps = mid.minus(fillPrice).div(mid).times('10000');
      return { fillPrice, slippageBps };
    }
  }
}
