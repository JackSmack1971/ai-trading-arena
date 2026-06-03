import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDb, type ArenaDb } from '../client.js';
import { appendEvent } from '../repositories/events.js';
import { countOrdersInLastMinute, countOrdersInWindow, countStrategySwitchesInLastHour, countStrategySwitchesInWindow } from '../repositories/events.js';
import type { InsertEvent } from '../schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');
const now = new Date('2026-06-03T12:00:00.000Z');

let db: ArenaDb;

function event(seq: number, type: string, createdAt: string, source = 'agent-a'): InsertEvent {
  return {
    id: `evt-window-${seq}`,
    runId: 'run-window',
    seq,
    type,
    source,
    timestamp: createdAt,
    payloadJson: JSON.stringify({ seq }),
    payloadHash: `hash-${seq}`,
    previousHash: null,
    createdAt,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db = createMemoryDb();
  migrate(db, { migrationsFolder });
});

describe('windowed event counters', () => {
  it('returns zero when no events exist', () => {
    expect(countOrdersInLastMinute(db, 'run-window')).toBe(0);
    expect(countStrategySwitchesInLastHour(db, 'run-window')).toBe(0);
  });

  it('excludes events outside their windows', () => {
    appendEvent(db, event(0, 'PAPER_ORDER_CREATED', new Date(now.getTime() - 60_001).toISOString()));
    appendEvent(db, event(1, 'STRATEGY_SWITCH_REQUESTED', new Date(now.getTime() - 3_600_001).toISOString()));
    expect(countOrdersInLastMinute(db, 'run-window')).toBe(0);
    expect(countStrategySwitchesInLastHour(db, 'run-window')).toBe(0);
  });

  it('includes events inside and at the boundary', () => {
    appendEvent(db, event(0, 'PAPER_ORDER_CREATED', new Date(now.getTime() - 60_000).toISOString()));
    appendEvent(db, event(1, 'PAPER_ORDER_CREATED', new Date(now.getTime() - 1_000).toISOString()));
    appendEvent(db, event(2, 'STRATEGY_SWITCH_REQUESTED', new Date(now.getTime() - 3_600_000).toISOString()));
    expect(countOrdersInLastMinute(db, 'run-window')).toBe(2);
    expect(countStrategySwitchesInLastHour(db, 'run-window')).toBe(1);
  });

  it('can scope legacy helper counts by agent', () => {
    appendEvent(db, event(0, 'PAPER_ORDER_CREATED', new Date(now.getTime() - 1_000).toISOString(), 'agent-a'));
    appendEvent(db, event(1, 'PAPER_ORDER_CREATED', new Date(now.getTime() - 1_000).toISOString(), 'agent-b'));
    appendEvent(db, event(2, 'STRATEGY_SWITCH_REQUESTED', new Date(now.getTime() - 1_000).toISOString(), 'agent-a'));
    expect(countOrdersInWindow(db, 'run-window', 'agent-a', 60_000)).toBe(1);
    expect(countStrategySwitchesInWindow(db, 'run-window', 'agent-a', 3_600_000)).toBe(1);
  });
});
