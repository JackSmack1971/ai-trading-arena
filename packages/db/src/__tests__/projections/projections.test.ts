import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryDb, type ArenaDb } from '../../client.js';
import { appendEvent } from '../../repositories/events.js';
import { projectAgentTelemetry, projectOrderHistory, projectPnL, projectPositions } from '../../projections/index.js';
import type { InsertEvent } from '../../schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../../drizzle');
let db: ArenaDb;
let seq = 0;

function append(type: string, payload: Record<string, unknown>, timestamp = '2026-01-01T00:00:00.000Z') {
  appendEvent(db, {
    id: `evt-proj-${seq}`,
    runId: 'run-proj',
    seq: seq++,
    type,
    source: 'agent-a',
    timestamp,
    payloadJson: JSON.stringify(payload),
    payloadHash: `hash-${seq}`,
    previousHash: null,
    createdAt: timestamp,
  } satisfies InsertEvent);
}

beforeEach(() => {
  seq = 0;
  db = createMemoryDb();
  migrate(db, { migrationsFolder });
});

describe('event-log projections', () => {
  it('returns deterministic empty projections', () => {
    expect(projectPositions(db, 'missing')).toEqual([]);
    expect(projectPnL(db, 'missing').netPnl).toBe('0.00000000');
    expect(projectOrderHistory(db, 'missing').orders).toEqual([]);
    expect(projectAgentTelemetry(db, 'missing').decisionsTotal).toBe(0);
  });

  it('projects positions, order history, PnL, and agent telemetry', () => {
    append('PAPER_ORDER_CREATED', { order: { orderId: 'order-a', runId: 'run-proj', agentId: 'agent-a', symbol: 'BTC-USD', orderType: 'MARKET', side: 'BUY', quantityUsd: '100.00000000', status: 'OPEN', filledQuantityUsd: '0.00000000', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } });
    append('PAPER_ORDER_FILLED', { fill: { fillId: 'fill-a', orderId: 'order-a', agentId: 'agent-a', symbol: 'BTC-USD', side: 'BUY', quantity: '0.00200000', price: '50000.00000000', fee: '0.15000000', slippageBps: '1.00000000', liquiditySource: 'paper', timestamp: '2026-01-01T00:00:01.000Z' } });
    append('POSITION_UPDATED', { position: { positionId: 'pos-a', runId: 'run-proj', agentId: 'agent-a', symbol: 'BTC-USD', side: 'LONG', quantity: '0.00200000', averageEntryPrice: '50000.00000000', currentPrice: '50500.00000000', unrealizedPnl: '1.00000000', realizedPnl: '0.00000000', openedAt: '2026-01-01T00:00:01.000Z', updatedAt: '2026-01-01T00:00:02.000Z' } });
    append('PNL_SNAPSHOT_CREATED', { snapshot: { snapshotId: 'pnl-a', runId: 'run-proj', agentId: 'agent-a', timestamp: '2026-01-01T00:00:02.000Z', equity: '10001.00000000', cashBalance: '9899.85000000', positionValue: '101.00000000', unrealizedPnl: '1.00000000', realizedPnl: '0.00000000', totalReturnPct: '0.01000000', maxDrawdownPct: '0.00000000', totalFeesPaid: '0.15000000', totalSlippagePaid: '0.01000000', tradeCount: 1 } });
    append('AGENT_DECISION_RECEIVED', { agentId: 'agent-a', decision: { action: 'NOOP' } });
    append('STRATEGY_SWITCH_REQUESTED', { agentId: 'agent-a', strategyId: 'demo-momentum' });

    expect(projectPositions(db, 'run-proj')).toHaveLength(1);
    expect(projectPnL(db, 'run-proj').netPnl).toBe('0.85000000');
    expect(projectOrderHistory(db, 'run-proj').orders[0]?.status).toBe('FILLED');
    expect(projectAgentTelemetry(db, 'run-proj')).toMatchObject({ decisionsTotal: 1, noopCount: 1, currentStrategy: 'demo-momentum' });
  });
});
