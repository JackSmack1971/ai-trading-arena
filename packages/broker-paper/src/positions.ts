import { nanoid } from 'nanoid';
import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';
import type { PaperFill, Position, PositionSide } from './types.js';

interface PositionState {
  positionId: string;
  runId: string;
  agentId: string;
  symbol: string;
  side: PositionSide;
  quantity: MoneyDecimal;
  averageEntryPrice: MoneyDecimal;
  currentPrice: MoneyDecimal;
  unrealizedPnl: MoneyDecimal;
  realizedPnl: MoneyDecimal;
  openedAt: string;
  updatedAt: string;
}

function toPosition(s: PositionState): Position {
  return {
    positionId: s.positionId,
    runId: s.runId,
    agentId: s.agentId,
    symbol: s.symbol,
    side: s.side,
    quantity: s.quantity.toString(),
    averageEntryPrice: s.averageEntryPrice.toString(),
    currentPrice: s.currentPrice.toString(),
    unrealizedPnl: s.unrealizedPnl.toString(),
    realizedPnl: s.realizedPnl.toString(),
    openedAt: s.openedAt,
    updatedAt: s.updatedAt,
  };
}

export class PositionTracker {
  private readonly runId: string;
  private readonly agentId: string;
  private positions: Map<string, PositionState> = new Map();
  private cumulativeRealizedPnl: MoneyDecimal = ZERO_MONEY;

  constructor(runId: string, agentId: string) {
    this.runId = runId;
    this.agentId = agentId;
  }

  applyFill(fill: PaperFill, timestamp: string): Position {
    const fillQty = new MoneyDecimal(fill.quantity);
    const fillPrice = new MoneyDecimal(fill.price);
    const existing = this.positions.get(fill.symbol);

    if (!existing) {
      const side: PositionSide = fill.side === 'BUY' ? 'LONG' : 'SHORT';
      const state: PositionState = {
        positionId: nanoid(),
        runId: this.runId,
        agentId: this.agentId,
        symbol: fill.symbol,
        side,
        quantity: fillQty,
        averageEntryPrice: fillPrice,
        currentPrice: fillPrice,
        unrealizedPnl: ZERO_MONEY,
        realizedPnl: ZERO_MONEY,
        openedAt: timestamp,
        updatedAt: timestamp,
      };
      this.positions.set(fill.symbol, state);
      return toPosition(state);
    }

    // Adding to an existing LONG position.
    if (fill.side === 'BUY' && existing.side === 'LONG') {
      const newQty = existing.quantity.plus(fillQty);
      const newAvg = existing.quantity
        .times(existing.averageEntryPrice)
        .plus(fillQty.times(fillPrice))
        .div(newQty);
      existing.quantity = newQty;
      existing.averageEntryPrice = newAvg;
      existing.currentPrice = fillPrice;
      existing.unrealizedPnl = existing.quantity
        .times(existing.currentPrice.minus(existing.averageEntryPrice));
      existing.updatedAt = timestamp;
      return toPosition(existing);
    }

    // Reducing or closing an existing LONG position.
    if (fill.side === 'SELL' && existing.side === 'LONG') {
      const closedQty = MoneyDecimal.min(fillQty, existing.quantity);
      const realized = fillPrice.minus(existing.averageEntryPrice).times(closedQty);
      existing.realizedPnl = existing.realizedPnl.plus(realized);
      this.cumulativeRealizedPnl = this.cumulativeRealizedPnl.plus(realized);
      existing.quantity = existing.quantity.minus(closedQty);
      existing.currentPrice = fillPrice;
      existing.updatedAt = timestamp;

      if (existing.quantity.isZero()) {
        existing.unrealizedPnl = ZERO_MONEY;
        const final = toPosition(existing);
        this.positions.delete(fill.symbol);
        return final;
      }

      existing.unrealizedPnl = existing.quantity
        .times(existing.currentPrice.minus(existing.averageEntryPrice));
      return toPosition(existing);
    }

    // Adding to an existing SHORT position.
    if (fill.side === 'SELL' && existing.side === 'SHORT') {
      const newQty = existing.quantity.plus(fillQty);
      const newAvg = existing.quantity
        .times(existing.averageEntryPrice)
        .plus(fillQty.times(fillPrice))
        .div(newQty);
      existing.quantity = newQty;
      existing.averageEntryPrice = newAvg;
      existing.currentPrice = fillPrice;
      existing.unrealizedPnl = existing.quantity
        .times(existing.averageEntryPrice.minus(existing.currentPrice));
      existing.updatedAt = timestamp;
      return toPosition(existing);
    }

    // Reducing or closing an existing SHORT position.
    if (fill.side === 'BUY' && existing.side === 'SHORT') {
      const closedQty = MoneyDecimal.min(fillQty, existing.quantity);
      const realized = existing.averageEntryPrice.minus(fillPrice).times(closedQty);
      existing.realizedPnl = existing.realizedPnl.plus(realized);
      this.cumulativeRealizedPnl = this.cumulativeRealizedPnl.plus(realized);
      existing.quantity = existing.quantity.minus(closedQty);
      existing.currentPrice = fillPrice;
      existing.updatedAt = timestamp;

      if (existing.quantity.isZero()) {
        existing.unrealizedPnl = ZERO_MONEY;
        const final = toPosition(existing);
        this.positions.delete(fill.symbol);
        return final;
      }

      existing.unrealizedPnl = existing.quantity
        .times(existing.averageEntryPrice.minus(existing.currentPrice));
      return toPosition(existing);
    }

    return toPosition(existing);
  }

  updatePrices(prices: Map<string, string>, timestamp: string): Position[] {
    const updated: Position[] = [];
    for (const [symbol, state] of this.positions) {
      const price = prices.get(symbol);
      if (!price) continue;
      state.currentPrice = new MoneyDecimal(price);
      state.unrealizedPnl =
        state.side === 'LONG'
          ? state.quantity.times(state.currentPrice.minus(state.averageEntryPrice))
          : state.quantity.times(state.averageEntryPrice.minus(state.currentPrice));
      state.updatedAt = timestamp;
      updated.push(toPosition(state));
    }
    return updated;
  }

  getPosition(symbol: string): Position | undefined {
    const s = this.positions.get(symbol);
    return s ? toPosition(s) : undefined;
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values()).map(toPosition);
  }

  getTotalUnrealizedPnl(): MoneyDecimal {
    let total = ZERO_MONEY;
    for (const s of this.positions.values()) {
      total = total.plus(s.unrealizedPnl);
    }
    return total;
  }

  getTotalPositionValue(): MoneyDecimal {
    let total = ZERO_MONEY;
    for (const s of this.positions.values()) {
      total = total.plus(s.quantity.times(s.currentPrice));
    }
    return total;
  }

  getCumulativeRealizedPnl(): MoneyDecimal {
    return this.cumulativeRealizedPnl;
  }
}
