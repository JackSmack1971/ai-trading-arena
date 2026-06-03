import { MoneyDecimal, PnLSummarySchema, type PnLSummary } from '@arena/core';
import type { ArenaDb } from '../client.js';
import { replayRun } from '../repositories/events.js';
import { money, parsePayload } from './helpers.js';

export function projectPnL(db: ArenaDb, runId: string): PnLSummary {
  let realizedPnl = new MoneyDecimal('0');
  let unrealizedPnl = new MoneyDecimal('0');
  let totalFees = new MoneyDecimal('0');
  let latestReturnPct = '0.00000000';

  for (const row of replayRun(db, runId)) {
    const payload = parsePayload(row);
    if (row.type === 'PAPER_ORDER_FILLED') {
      const fill = payload['fill'] as Record<string, unknown> | undefined;
      if (fill?.['fee']) totalFees = totalFees.plus(String(fill['fee']));
    }
    if (row.type === 'PNL_SNAPSHOT_CREATED') {
      const snapshot = payload['snapshot'] as Record<string, unknown> | undefined;
      if (snapshot) {
        realizedPnl = new MoneyDecimal(String(snapshot['realizedPnl'] ?? realizedPnl));
        unrealizedPnl = new MoneyDecimal(String(snapshot['unrealizedPnl'] ?? unrealizedPnl));
        totalFees = new MoneyDecimal(String(snapshot['totalFeesPaid'] ?? totalFees));
        latestReturnPct = money(String(snapshot['totalReturnPct'] ?? latestReturnPct));
      }
    }
  }

  const netPnl = realizedPnl.plus(unrealizedPnl).minus(totalFees);
  return PnLSummarySchema.parse({
    runId,
    realizedPnl: realizedPnl.toFixed(8),
    unrealizedPnl: unrealizedPnl.toFixed(8),
    totalFees: totalFees.toFixed(8),
    netPnl: netPnl.toFixed(8),
    returnPct: latestReturnPct,
  });
}
