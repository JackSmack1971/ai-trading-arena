import { describe, expect, it } from 'vitest';
import { MoneyDecimal } from '../money/decimal.js';
import { PositionTracker } from '../positions.js';
import type { PaperFill } from '../types.js';

const RUN = 'run-1';
const AGENT = 'agent-a';
const TS1 = '2024-01-01T00:00:00.000Z';
const TS2 = '2024-01-01T00:01:00.000Z';
const TS3 = '2024-01-01T00:02:00.000Z';

function fill(overrides: Partial<PaperFill> & Pick<PaperFill, 'side' | 'quantity' | 'price'>): PaperFill {
  return {
    fillId: 'fill-1',
    orderId: 'ord-1',
    agentId: AGENT,
    symbol: 'BTC-USD',
    fee: '1.50',
    slippageBps: '10',
    liquiditySource: 'taker',
    timestamp: TS1,
    ...overrides,
  };
}

describe('PositionTracker', () => {
  it('opens a LONG position on BUY fill', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    const pos = tracker.applyFill(fill({ side: 'BUY', quantity: '0.02', price: '49100' }), TS1);
    expect(pos.side).toBe('LONG');
    expect(new MoneyDecimal(pos.quantity).toFixed(8)).toBe('0.02000000');
    expect(new MoneyDecimal(pos.averageEntryPrice).toFixed(2)).toBe('49100.00');
    expect(pos.unrealizedPnl).toBe('0');
  });

  it('averages entry price on second BUY', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ fillId: 'f1', side: 'BUY', quantity: '0.01', price: '49000' }), TS1);
    tracker.applyFill(fill({ fillId: 'f2', side: 'BUY', quantity: '0.01', price: '50000' }), TS2);
    const pos = tracker.getPosition('BTC-USD')!;
    // avg = (0.01*49000 + 0.01*50000) / 0.02 = 49500
    expect(new MoneyDecimal(pos.averageEntryPrice).toFixed(2)).toBe('49500.00');
    expect(new MoneyDecimal(pos.quantity).toFixed(8)).toBe('0.02000000');
  });

  it('computes realized P&L on SELL fill (profit)', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ fillId: 'f1', side: 'BUY', quantity: '0.02', price: '49100' }), TS1);
    const afterSell = tracker.applyFill(
      fill({ fillId: 'f2', side: 'SELL', quantity: '0.01', price: '50000' }),
      TS2,
    );
    // realized = (50000 - 49100) * 0.01 = 9.00
    expect(new MoneyDecimal(afterSell.realizedPnl).toFixed(2)).toBe('9.00');
  });

  it('computes realized P&L on SELL fill (loss)', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ fillId: 'f1', side: 'BUY', quantity: '0.02', price: '50000' }), TS1);
    const afterSell = tracker.applyFill(
      fill({ fillId: 'f2', side: 'SELL', quantity: '0.01', price: '48000' }),
      TS2,
    );
    // realized = (48000 - 50000) * 0.01 = -20.00
    expect(new MoneyDecimal(afterSell.realizedPnl).toFixed(2)).toBe('-20.00');
  });

  it('fully closes position and removes it', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ fillId: 'f1', side: 'BUY', quantity: '0.02', price: '49100' }), TS1);
    tracker.applyFill(fill({ fillId: 'f2', side: 'SELL', quantity: '0.02', price: '50000' }), TS2);
    expect(tracker.getPosition('BTC-USD')).toBeUndefined();
    // realized = (50000 - 49100) * 0.02 = 18.00
    expect(new MoneyDecimal(tracker.getCumulativeRealizedPnl()).toFixed(2)).toBe('18.00');
  });

  it('updatePrices updates unrealized P&L', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ side: 'BUY', quantity: '0.02', price: '49100' }), TS1);
    tracker.updatePrices(new Map([['BTC-USD', '50000']]), TS2);
    const pos = tracker.getPosition('BTC-USD')!;
    // unrealized = (50000 - 49100) * 0.02 = 18.00
    expect(new MoneyDecimal(pos.unrealizedPnl).toFixed(2)).toBe('18.00');
  });

  it('cumulative realized P&L accumulates across partial sells', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ fillId: 'f1', side: 'BUY', quantity: '0.03', price: '49100' }), TS1);
    tracker.applyFill(fill({ fillId: 'f2', side: 'SELL', quantity: '0.01', price: '50000' }), TS2);
    tracker.applyFill(fill({ fillId: 'f3', side: 'SELL', quantity: '0.01', price: '51000' }), TS3);
    // first sell: (50000-49100)*0.01 = 9.00
    // second sell: (51000-49100)*0.01 = 19.00
    // total: 28.00
    expect(new MoneyDecimal(tracker.getCumulativeRealizedPnl()).toFixed(2)).toBe('28.00');
  });

  it('getTotalPositionValue returns correct value', () => {
    const tracker = new PositionTracker(RUN, AGENT);
    tracker.applyFill(fill({ side: 'BUY', quantity: '0.02', price: '49100' }), TS1);
    tracker.updatePrices(new Map([['BTC-USD', '50000']]), TS2);
    // 0.02 * 50000 = 1000
    expect(tracker.getTotalPositionValue().toFixed(2)).toBe('1000.00');
  });
});
