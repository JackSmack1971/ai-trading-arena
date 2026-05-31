import { nanoid } from 'nanoid';
import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';

export type LedgerEntryType =
  | 'DEPOSIT'
  | 'FILL_BUY_DEBIT'
  | 'FILL_SELL_CREDIT'
  | 'FEE_DEBIT'
  | 'RESERVE'
  | 'RESERVE_RELEASE';

export interface LedgerEntry {
  entryId: string;
  type: LedgerEntryType;
  amount: string;
  balance: string;
  reserved: string;
  reference: string;
  timestamp: string;
}

export class CashLedger {
  private readonly entries: LedgerEntry[] = [];
  private balance: MoneyDecimal;
  private reserved: MoneyDecimal = ZERO_MONEY;

  constructor(startingBalance: string) {
    this.balance = new MoneyDecimal(startingBalance);
  }

  recordDeposit(amount: string, timestamp: string): LedgerEntry {
    return this.push('DEPOSIT', amount, 'deposit', timestamp);
  }

  // Debit notional for a BUY fill (cash out)
  recordBuyDebit(notionalUsd: string, fillId: string, timestamp: string): LedgerEntry {
    this.balance = this.balance.minus(notionalUsd);
    return this.push('FILL_BUY_DEBIT', notionalUsd, fillId, timestamp);
  }

  // Credit proceeds for a SELL fill (cash in)
  recordSellCredit(notionalUsd: string, fillId: string, timestamp: string): LedgerEntry {
    this.balance = this.balance.plus(notionalUsd);
    return this.push('FILL_SELL_CREDIT', notionalUsd, fillId, timestamp);
  }

  recordFeeDebit(fee: string, fillId: string, timestamp: string): LedgerEntry {
    this.balance = this.balance.minus(fee);
    return this.push('FEE_DEBIT', fee, fillId, timestamp);
  }

  // Reserve available balance for a pending limit order
  reserve(amount: string, orderId: string, timestamp: string): boolean {
    const r = new MoneyDecimal(amount);
    if (this.getAvailable().lt(r)) return false;
    this.reserved = this.reserved.plus(r);
    this.entries.push({
      entryId: nanoid(),
      type: 'RESERVE',
      amount,
      balance: this.balance.toString(),
      reserved: this.reserved.toString(),
      reference: orderId,
      timestamp,
    });
    return true;
  }

  // Release reserved amount when an order is cancelled or filled
  releaseReserve(amount: string, orderId: string, timestamp: string): void {
    const r = new MoneyDecimal(amount);
    this.reserved = MoneyDecimal.max(ZERO_MONEY, this.reserved.minus(r));
    this.entries.push({
      entryId: nanoid(),
      type: 'RESERVE_RELEASE',
      amount,
      balance: this.balance.toString(),
      reserved: this.reserved.toString(),
      reference: orderId,
      timestamp,
    });
  }

  getBalance(): MoneyDecimal {
    return this.balance;
  }

  getReserved(): MoneyDecimal {
    return this.reserved;
  }

  getAvailable(): MoneyDecimal {
    return this.balance.minus(this.reserved);
  }

  getEntries(): readonly LedgerEntry[] {
    return this.entries;
  }

  private push(type: LedgerEntryType, amount: string, reference: string, timestamp: string): LedgerEntry {
    const entry: LedgerEntry = {
      entryId: nanoid(),
      type,
      amount,
      balance: this.balance.toString(),
      reserved: this.reserved.toString(),
      reference,
      timestamp,
    };
    this.entries.push(entry);
    return entry;
  }
}
