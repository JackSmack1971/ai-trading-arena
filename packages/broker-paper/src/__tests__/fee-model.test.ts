import { describe, expect, it } from 'vitest';
import { MoneyDecimal } from '../money/decimal.js';
import { DEFAULT_FEE_CONFIG, TakerMakerFeeModel } from '../fee-model.js';

describe('TakerMakerFeeModel', () => {
  const model = new TakerMakerFeeModel(DEFAULT_FEE_CONFIG);

  it('charges taker fee for MARKET BUY', () => {
    const fee = model.computeFee({ side: 'BUY', notionalUsd: new MoneyDecimal('1000'), orderType: 'MARKET' });
    // 1000 * 15 / 10000 = 1.5
    expect(fee.toFixed(2)).toBe('1.50');
  });

  it('charges taker fee for MARKET SELL', () => {
    const fee = model.computeFee({ side: 'SELL', notionalUsd: new MoneyDecimal('1000'), orderType: 'MARKET' });
    expect(fee.toFixed(2)).toBe('1.50');
  });

  it('charges maker fee for LIMIT BUY', () => {
    const fee = model.computeFee({ side: 'BUY', notionalUsd: new MoneyDecimal('1000'), orderType: 'LIMIT' });
    // 1000 * 10 / 10000 = 1.0
    expect(fee.toFixed(2)).toBe('1.00');
  });

  it('charges maker fee for LIMIT SELL', () => {
    const fee = model.computeFee({ side: 'SELL', notionalUsd: new MoneyDecimal('500'), orderType: 'LIMIT' });
    // 500 * 10 / 10000 = 0.5
    expect(fee.toFixed(2)).toBe('0.50');
  });

  it('custom fee config applied', () => {
    const custom = new TakerMakerFeeModel({ makerFeeBps: '5', takerFeeBps: '20' });
    const taker = custom.computeFee({ side: 'BUY', notionalUsd: new MoneyDecimal('1000'), orderType: 'MARKET' });
    const maker = custom.computeFee({ side: 'BUY', notionalUsd: new MoneyDecimal('1000'), orderType: 'LIMIT' });
    expect(taker.toFixed(2)).toBe('2.00');
    expect(maker.toFixed(2)).toBe('0.50');
  });

  it('zero fee config returns zero', () => {
    const zero = new TakerMakerFeeModel({ makerFeeBps: '0', takerFeeBps: '0' });
    const fee = zero.computeFee({ side: 'BUY', notionalUsd: new MoneyDecimal('1000'), orderType: 'MARKET' });
    expect(fee.toString()).toBe('0');
  });
});
