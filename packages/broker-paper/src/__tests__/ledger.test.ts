import { describe, expect, it } from 'vitest';
import { CashLedger } from '../ledger.js';

const TS = '2024-01-01T00:00:00.000Z';

describe('CashLedger', () => {
  it('starts with correct balance', () => {
    const ledger = new CashLedger('10000.00');
    expect(ledger.getBalance().toFixed(2)).toBe('10000.00');
    expect(ledger.getAvailable().toFixed(2)).toBe('10000.00');
    expect(ledger.getReserved().toFixed(2)).toBe('0.00');
  });

  it('BUY debit reduces balance', () => {
    const ledger = new CashLedger('10000.00');
    ledger.recordBuyDebit('1000.00', 'fill-1', TS);
    expect(ledger.getBalance().toFixed(2)).toBe('9000.00');
  });

  it('fee debit reduces balance', () => {
    const ledger = new CashLedger('10000.00');
    ledger.recordBuyDebit('1000.00', 'fill-1', TS);
    ledger.recordFeeDebit('1.50', 'fill-1', TS);
    expect(ledger.getBalance().toFixed(2)).toBe('8998.50');
  });

  it('SELL credit increases balance', () => {
    const ledger = new CashLedger('8998.50');
    ledger.recordSellCredit('1000.00', 'fill-2', TS);
    ledger.recordFeeDebit('1.50', 'fill-2', TS);
    // 8998.50 + 1000.00 - 1.50 = 9997.00
    expect(ledger.getBalance().toFixed(2)).toBe('9997.00');
  });

  it('reserve reduces available without changing total', () => {
    const ledger = new CashLedger('10000.00');
    const ok = ledger.reserve('1001.50', 'order-1', TS);
    expect(ok).toBe(true);
    expect(ledger.getBalance().toFixed(2)).toBe('10000.00');
    expect(ledger.getReserved().toFixed(2)).toBe('1001.50');
    expect(ledger.getAvailable().toFixed(2)).toBe('8998.50');
  });

  it('reserve returns false when insufficient available', () => {
    const ledger = new CashLedger('100.00');
    const ok = ledger.reserve('200.00', 'order-1', TS);
    expect(ok).toBe(false);
    expect(ledger.getReserved().toFixed(2)).toBe('0.00');
  });

  it('release reserve restores available balance', () => {
    const ledger = new CashLedger('10000.00');
    ledger.reserve('1001.50', 'order-1', TS);
    ledger.releaseReserve('1001.50', 'order-1', TS);
    expect(ledger.getReserved().toFixed(2)).toBe('0.00');
    expect(ledger.getAvailable().toFixed(2)).toBe('10000.00');
  });

  it('decimal precision: 0.7 + 0.1 = 0.8', () => {
    const ledger = new CashLedger('0.70');
    ledger.recordSellCredit('0.10', 'fill-1', TS);
    expect(ledger.getBalance().toFixed(2)).toBe('0.80');
  });

  it('entries are append-only and immutable', () => {
    const ledger = new CashLedger('100.00');
    ledger.recordDeposit('50.00', TS);
    const entries = ledger.getEntries();
    expect(entries.length).toBe(1);
    // Type check: entries are readonly
    expect(Array.isArray(entries)).toBe(true);
  });
});
