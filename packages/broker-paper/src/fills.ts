import { MoneyDecimal } from './money/decimal.js';
import type { FeeModel } from './fee-model.js';
import type { SlippageModel } from './slippage-model.js';
import type { MarketTick, PaperOrder } from './types.js';

export interface FillCalculation {
  fillPrice: string;
  quantityBase: string;
  fee: string;
  slippageBps: string;
  liquiditySource: string;
}

export function computeMarketFill(params: {
  order: PaperOrder;
  tick: MarketTick;
  feeModel: FeeModel;
  slippageModel: SlippageModel;
}): FillCalculation {
  const { order, tick, feeModel, slippageModel } = params;
  const bid = new MoneyDecimal(tick.bid);
  const ask = new MoneyDecimal(tick.ask);
  const notionalUsd = new MoneyDecimal(order.quantityUsd);

  const { fillPrice, slippageBps } = slippageModel.computeSlippage({ side: order.side, bid, ask });
  const quantityBase = notionalUsd.div(fillPrice);
  const fee = feeModel.computeFee({ side: order.side, notionalUsd, orderType: 'MARKET' });

  return {
    fillPrice: fillPrice.toString(),
    quantityBase: quantityBase.toString(),
    fee: fee.toString(),
    slippageBps: slippageBps.toString(),
    liquiditySource: 'taker',
  };
}

// Returns null when the limit price has not been reached yet.
export function computeLimitFill(params: {
  order: PaperOrder;
  tick: MarketTick;
  feeModel: FeeModel;
}): FillCalculation | null {
  const { order, tick, feeModel } = params;
  if (!order.limitPrice) return null;

  const limitPrice = new MoneyDecimal(order.limitPrice);
  const bid = new MoneyDecimal(tick.bid);
  const ask = new MoneyDecimal(tick.ask);

  // BUY limit fills when ask crosses down through the limit price.
  // SELL limit fills when bid crosses up through the limit price.
  const shouldFill =
    order.side === 'BUY' ? ask.lte(limitPrice) : bid.gte(limitPrice);

  if (!shouldFill) return null;

  const notionalUsd = new MoneyDecimal(order.quantityUsd);
  const quantityBase = notionalUsd.div(limitPrice);
  const fee = feeModel.computeFee({ side: order.side, notionalUsd, orderType: 'LIMIT' });

  // Slippage vs midpoint for reporting (may be negative if filled better than mid).
  const mid = bid.plus(ask).div('2');
  const rawBps =
    order.side === 'BUY'
      ? limitPrice.minus(mid).div(mid).times('10000')
      : mid.minus(limitPrice).div(mid).times('10000');
  const slippageBps = MoneyDecimal.max(new MoneyDecimal('0'), rawBps);

  return {
    fillPrice: limitPrice.toString(),
    quantityBase: quantityBase.toString(),
    fee: fee.toString(),
    slippageBps: slippageBps.toString(),
    liquiditySource: 'maker',
  };
}
