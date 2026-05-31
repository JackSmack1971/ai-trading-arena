import { MoneyDecimal } from './money/decimal.js';
import type { OrderSide, OrderType } from './types.js';

export interface FeeModel {
  computeFee(params: {
    side: OrderSide;
    notionalUsd: MoneyDecimal;
    orderType: OrderType;
  }): MoneyDecimal;
}

export interface TakerMakerFeeConfig {
  makerFeeBps: string;
  takerFeeBps: string;
}

export const DEFAULT_FEE_CONFIG: TakerMakerFeeConfig = {
  makerFeeBps: '10',
  takerFeeBps: '15',
};

export class TakerMakerFeeModel implements FeeModel {
  private readonly makerBps: MoneyDecimal;
  private readonly takerBps: MoneyDecimal;

  constructor(config: TakerMakerFeeConfig = DEFAULT_FEE_CONFIG) {
    this.makerBps = new MoneyDecimal(config.makerFeeBps);
    this.takerBps = new MoneyDecimal(config.takerFeeBps);
  }

  computeFee({ notionalUsd, orderType }: { side: OrderSide; notionalUsd: MoneyDecimal; orderType: OrderType }): MoneyDecimal {
    // MARKET orders take liquidity → taker fee
    // LIMIT/STOP/STOP_LIMIT orders provide liquidity → maker fee
    const bps = orderType === 'MARKET' ? this.takerBps : this.makerBps;
    return notionalUsd.times(bps).div('10000');
  }
}
