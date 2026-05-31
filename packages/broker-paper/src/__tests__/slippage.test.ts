import { describe, expect, it } from 'vitest';
import { MoneyDecimal } from '../money/decimal.js';
import { SpreadSlippageModel } from '../slippage-model.js';

describe('SpreadSlippageModel', () => {
  const bid = new MoneyDecimal('49000');
  const ask = new MoneyDecimal('49100');
  // mid = 49050

  it('BUY fills at ask when no additional slippage', () => {
    const model = new SpreadSlippageModel({ additionalSlippageBps: '0' });
    const result = model.computeSlippage({ side: 'BUY', bid, ask });
    expect(result.fillPrice.toFixed(2)).toBe('49100.00');
  });

  it('SELL fills at bid when no additional slippage', () => {
    const model = new SpreadSlippageModel({ additionalSlippageBps: '0' });
    const result = model.computeSlippage({ side: 'SELL', bid, ask });
    expect(result.fillPrice.toFixed(2)).toBe('49000.00');
  });

  it('BUY slippage bps equals half-spread vs mid', () => {
    const model = new SpreadSlippageModel({ additionalSlippageBps: '0' });
    const result = model.computeSlippage({ side: 'BUY', bid, ask });
    // ask - mid = 50; mid = 49050; bps = 50/49050*10000 ≈ 10.19...
    const expected = new MoneyDecimal('49100').minus('49050').div('49050').times('10000');
    expect(result.slippageBps.toFixed(6)).toBe(expected.toFixed(6));
  });

  it('SELL slippage bps equals half-spread vs mid', () => {
    const model = new SpreadSlippageModel({ additionalSlippageBps: '0' });
    const result = model.computeSlippage({ side: 'SELL', bid, ask });
    // mid - bid = 50; bps = 50/49050*10000
    const expected = new MoneyDecimal('49050').minus('49000').div('49050').times('10000');
    expect(result.slippageBps.toFixed(6)).toBe(expected.toFixed(6));
  });

  it('additional slippage increases fill cost', () => {
    const model = new SpreadSlippageModel({ additionalSlippageBps: '10' });
    const { fillPrice } = model.computeSlippage({ side: 'BUY', bid, ask });
    // extra = 49050 * 10 / 10000 = 49.05; fill = 49100 + 49.05 = 49149.05
    expect(fillPrice.toFixed(2)).toBe('49149.05');
  });
});
