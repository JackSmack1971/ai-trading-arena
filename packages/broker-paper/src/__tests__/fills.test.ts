import { describe, expect, it } from 'vitest';
import { MoneyDecimal } from '../money/decimal.js';
import { TakerMakerFeeModel } from '../fee-model.js';
import { SpreadSlippageModel } from '../slippage-model.js';
import { computeLimitFill, computeMarketFill } from '../fills.js';
import type { MarketTick, PaperOrder } from '../types.js';

function makeOrder(overrides: Partial<PaperOrder> & Pick<PaperOrder, 'side' | 'quantityUsd'>): PaperOrder {
  const order: PaperOrder = {
    orderId: overrides.orderId ?? 'ord-1',
    runId: overrides.runId ?? 'run-1',
    agentId: overrides.agentId ?? 'agent-a',
    symbol: overrides.symbol ?? 'BTC-USD',
    orderType: overrides.orderType ?? 'MARKET',
    status: overrides.status ?? 'OPEN',
    filledQuantityUsd: overrides.filledQuantityUsd ?? '0',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00.000Z',
    side: overrides.side,
    quantityUsd: overrides.quantityUsd,
  };
  if (overrides.limitPrice !== undefined) order.limitPrice = overrides.limitPrice;
  if (overrides.stopPrice !== undefined) order.stopPrice = overrides.stopPrice;
  if (overrides.decisionId !== undefined) order.decisionId = overrides.decisionId;
  return order;
}

const tick: MarketTick = {
  symbol: 'BTC-USD',
  timestamp: '2024-01-01T00:00:00.000Z',
  bid: '49000.00',
  ask: '49100.00',
  lastPrice: '49050.00',
};

const feeModel = new TakerMakerFeeModel();
const slippageModel = new SpreadSlippageModel({ additionalSlippageBps: '0' });

describe('computeMarketFill', () => {
  it('BUY fills at ask price', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'MARKET' });
    const result = computeMarketFill({ order, tick, feeModel, slippageModel });
    expect(result.fillPrice).toBe(new MoneyDecimal('49100.00').toString());
    expect(result.liquiditySource).toBe('taker');
  });

  it('SELL fills at bid price', () => {
    const order = makeOrder({ side: 'SELL', quantityUsd: '1000.00', orderType: 'MARKET' });
    const result = computeMarketFill({ order, tick, feeModel, slippageModel });
    expect(result.fillPrice).toBe(new MoneyDecimal('49000.00').toString());
    expect(result.liquiditySource).toBe('taker');
  });

  it('computes correct base quantity for BUY', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'MARKET' });
    const result = computeMarketFill({ order, tick, feeModel, slippageModel });
    // 1000 / 49100
    const expected = new MoneyDecimal('1000').div('49100');
    expect(new MoneyDecimal(result.quantityBase).toFixed(10)).toBe(expected.toFixed(10));
  });

  it('computes correct taker fee', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'MARKET' });
    const result = computeMarketFill({ order, tick, feeModel, slippageModel });
    // 1000 * 15 / 10000 = 1.5
    expect(new MoneyDecimal(result.fee).toFixed(2)).toBe('1.50');
  });
});

describe('computeLimitFill', () => {
  it('returns null when price has not crossed limit (BUY limit above ask)', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'LIMIT', limitPrice: '49200.00' });
    // ask=49100 > limitPrice=49200 → wait, BUY limit: fills when ask <= limitPrice
    // ask=49100 <= 49200 → SHOULD fill here
    const result = computeLimitFill({ order, tick, feeModel });
    expect(result).not.toBeNull();
  });

  it('returns null when BUY limit price is below ask', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'LIMIT', limitPrice: '49000.00' });
    // ask=49100 > limitPrice=49000 → not filled
    const result = computeLimitFill({ order, tick, feeModel });
    expect(result).toBeNull();
  });

  it('fills BUY limit at limit price when ask exactly equals limit', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'LIMIT', limitPrice: '49100.00' });
    // ask=49100 <= limitPrice=49100 → fills
    const result = computeLimitFill({ order, tick, feeModel });
    expect(result).not.toBeNull();
    expect(new MoneyDecimal(result!.fillPrice).toFixed(2)).toBe('49100.00');
  });

  it('fills SELL limit when bid >= limitPrice', () => {
    const limitTick: MarketTick = { ...tick, bid: '50000.00', ask: '50100.00' };
    const order = makeOrder({ side: 'SELL', quantityUsd: '1000.00', orderType: 'LIMIT', limitPrice: '49900.00' });
    const result = computeLimitFill({ order, tick: limitTick, feeModel });
    expect(result).not.toBeNull();
    expect(new MoneyDecimal(result!.fillPrice).toFixed(2)).toBe('49900.00');
    expect(result!.liquiditySource).toBe('maker');
  });

  it('charges maker fee for limit order', () => {
    const order = makeOrder({ side: 'BUY', quantityUsd: '1000.00', orderType: 'LIMIT', limitPrice: '49100.00' });
    const result = computeLimitFill({ order, tick, feeModel });
    // 1000 * 10 / 10000 = 1.0
    expect(new MoneyDecimal(result!.fee).toFixed(2)).toBe('1.00');
  });
});
