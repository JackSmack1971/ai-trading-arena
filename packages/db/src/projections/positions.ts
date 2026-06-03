import { PositionSnapshotSchema, type PositionSnapshot } from '@arena/core';
import type { ArenaDb } from '../client.js';
import { replayRun } from '../repositories/events.js';
import { parsePayload } from './helpers.js';

export function projectPositions(db: ArenaDb, runId: string): PositionSnapshot[] {
  const snapshots = new Map<string, PositionSnapshot>();
  for (const row of replayRun(db, runId)) {
    if (row.type !== 'POSITION_UPDATED') continue;
    const payload = parsePayload(row);
    const position = payload['position'] as Record<string, unknown> | undefined;
    if (!position) continue;
    const snapshot = PositionSnapshotSchema.parse({
      agentId: position['agentId'],
      symbol: position['symbol'],
      side: position['side'],
      quantity: position['quantity'],
      averageEntryPrice: position['averageEntryPrice'],
      currentPrice: position['currentPrice'],
      unrealizedPnl: position['unrealizedPnl'],
      realizedPnl: position['realizedPnl'] ?? '0.00000000',
      updatedAt: position['updatedAt'] ?? row.timestamp,
    });
    snapshots.set(`${snapshot.agentId}:${snapshot.symbol}`, snapshot);
  }
  return [...snapshots.values()].filter((position) => position.quantity !== '0' && position.quantity !== '0.00000000');
}
