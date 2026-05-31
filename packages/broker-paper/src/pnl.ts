import { nanoid } from 'nanoid';
import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';
import type { PnLSnapshot } from './types.js';

export class PnLTracker {
  private readonly startingBalance: MoneyDecimal;
  private highWaterMarkEquity: MoneyDecimal;
  private maxDrawdownPct: MoneyDecimal = ZERO_MONEY;

  constructor(startingBalance: string) {
    this.startingBalance = new MoneyDecimal(startingBalance);
    this.highWaterMarkEquity = this.startingBalance;
  }

  snapshot(params: {
    runId: string;
    agentId: string;
    cashBalance: MoneyDecimal;
    positionValue: MoneyDecimal;
    unrealizedPnl: MoneyDecimal;
    realizedPnl: MoneyDecimal;
    totalFeesPaid: MoneyDecimal;
    totalSlippagePaid: MoneyDecimal;
    tradeCount: number;
    timestamp: string;
  }): PnLSnapshot {
    const {
      runId, agentId, cashBalance, positionValue,
      unrealizedPnl, realizedPnl, totalFeesPaid, totalSlippagePaid, tradeCount, timestamp,
    } = params;

    const equity = cashBalance.plus(positionValue);

    // Update high-water mark and drawdown.
    if (equity.gt(this.highWaterMarkEquity)) {
      this.highWaterMarkEquity = equity;
    }
    const drawdown = this.highWaterMarkEquity.gt(ZERO_MONEY)
      ? this.highWaterMarkEquity.minus(equity).div(this.highWaterMarkEquity).times('100')
      : ZERO_MONEY;
    const currentDrawdownPct = MoneyDecimal.max(ZERO_MONEY, drawdown);
    if (currentDrawdownPct.gt(this.maxDrawdownPct)) {
      this.maxDrawdownPct = currentDrawdownPct;
    }

    const totalReturnPct = this.startingBalance.gt(ZERO_MONEY)
      ? equity.minus(this.startingBalance).div(this.startingBalance).times('100')
      : ZERO_MONEY;

    return {
      snapshotId: nanoid(),
      runId,
      agentId,
      timestamp,
      equity: equity.toString(),
      cashBalance: cashBalance.toString(),
      positionValue: positionValue.toString(),
      unrealizedPnl: unrealizedPnl.toString(),
      realizedPnl: realizedPnl.toString(),
      totalReturnPct: totalReturnPct.toString(),
      maxDrawdownPct: this.maxDrawdownPct.toString(),
      totalFeesPaid: totalFeesPaid.toString(),
      totalSlippagePaid: totalSlippagePaid.toString(),
      tradeCount,
    };
  }

  getMaxDrawdownPct(): MoneyDecimal {
    return this.maxDrawdownPct;
  }
}
