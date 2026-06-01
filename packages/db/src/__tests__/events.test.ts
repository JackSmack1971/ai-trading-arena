import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryDb, type ArenaDb } from '../client.js';
import { appendEvent, appendEvents, countEvents, getEvent, replayRun, appendEventPayload, verifyHashChain } from '../repositories/events.js';
import { projectEventTypeCounts, projectRunSummary } from '../projections/index.js';
import { events, type InsertEvent } from '../schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function makeEvent(
  overrides: Partial<InsertEvent> & { runId: string; seq: number; type: string },
): InsertEvent {
  const payload = JSON.stringify({ tick: overrides.seq, symbol: 'BTC-USD' });
  const payloadHash = sha256(payload);
  return {
    id: overrides.id ?? `evt-${overrides.runId}-${overrides.seq}`,
    source: overrides.source ?? 'test',
    timestamp: overrides.timestamp ?? new Date(Date.UTC(2024, 0, 1, 0, 0, overrides.seq)).toISOString(),
    payloadJson: overrides.payloadJson ?? payload,
    payloadHash: overrides.payloadHash ?? payloadHash,
    previousHash: overrides.previousHash ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    runId: overrides.runId,
    seq: overrides.seq,
    type: overrides.type,
  };
}

function makeChainedEvents(runId: string, count: number): InsertEvent[] {
  const evts: InsertEvent[] = [];
  let prevHash: string | null = null;
  for (let i = 0; i < count; i++) {
    const payload = JSON.stringify({ tick: i, symbol: 'BTC-USD' });
    const payloadHash = sha256(payload);
    evts.push({
      id: `evt-${runId}-${i}`,
      runId,
      seq: i,
      type: i === 0 ? 'MARKET_TICK_RECEIVED' : i < 5 ? 'BAR_CLOSED' : 'AGENT_DECISION_RECEIVED',
      source: 'test',
      timestamp: new Date(Date.UTC(2024, 0, 1, 0, 0, i)).toISOString(),
      payloadJson: payload,
      payloadHash,
      previousHash: prevHash,
      createdAt: new Date().toISOString(),
    });
    prevHash = payloadHash;
  }
  return evts;
}

let db: ArenaDb;

beforeEach(() => {
  db = createMemoryDb();
  migrate(db, { migrationsFolder });
});

afterEach(() => {
  // in-memory DB is released by GC; nothing to close explicitly
});

describe('appendEvent + replayRun', () => {
  it('appends 10 events and replays them identically', () => {
    const runId = 'run-replay-10';
    const evts = makeChainedEvents(runId, 10);

    for (const ev of evts) {
      appendEvent(db, ev);
    }

    const replayed = replayRun(db, runId);
    expect(replayed).toHaveLength(10);

    for (let i = 0; i < 10; i++) {
      const original = evts[i]!;
      const replayed_ev = replayed[i]!;
      expect(replayed_ev.id).toBe(original.id);
      expect(replayed_ev.runId).toBe(original.runId);
      expect(replayed_ev.seq).toBe(original.seq);
      expect(replayed_ev.type).toBe(original.type);
      expect(replayed_ev.source).toBe(original.source);
      expect(replayed_ev.timestamp).toBe(original.timestamp);
      expect(replayed_ev.payloadJson).toBe(original.payloadJson);
      expect(replayed_ev.payloadHash).toBe(original.payloadHash);
      expect(replayed_ev.previousHash).toBe(original.previousHash);
    }
  });

  it('replayed events are in seq order regardless of insert order', () => {
    const runId = 'run-order-test';
    const evts = makeChainedEvents(runId, 5);

    // Insert in reverse order
    for (const ev of [...evts].reverse()) {
      appendEvent(db, ev);
    }

    const replayed = replayRun(db, runId);
    expect(replayed).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(replayed[i]!.seq).toBe(i);
    }
  });

  it('appendEvents batch inserts correctly', () => {
    const runId = 'run-batch';
    const evts = makeChainedEvents(runId, 10);
    appendEvents(db, evts);

    const replayed = replayRun(db, runId);
    expect(replayed).toHaveLength(10);
  });

  it('replays from two different runs independently', () => {
    const evtsA = makeChainedEvents('run-A', 5);
    const evtsB = makeChainedEvents('run-B', 3);

    appendEvents(db, evtsA);
    appendEvents(db, evtsB);

    expect(replayRun(db, 'run-A')).toHaveLength(5);
    expect(replayRun(db, 'run-B')).toHaveLength(3);
    expect(replayRun(db, 'run-X')).toHaveLength(0);
  });

  it('getEvent retrieves a single event by id', () => {
    const ev = makeEvent({ runId: 'run-get', seq: 0, type: 'MARKET_TICK_RECEIVED' });
    appendEvent(db, ev);

    const found = getEvent(db, ev.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(ev.id);
    expect(found!.payloadHash).toBe(ev.payloadHash);

    expect(getEvent(db, 'nonexistent')).toBeUndefined();
  });

  it('countEvents returns correct count', () => {
    const runId = 'run-count';
    appendEvents(db, makeChainedEvents(runId, 7));
    expect(countEvents(db, runId)).toBe(7);
    expect(countEvents(db, 'empty-run')).toBe(0);
  });

  it('id is PRIMARY KEY — duplicate id throws', () => {
    const ev = makeEvent({ runId: 'run-dup', seq: 0, type: 'MARKET_TICK_RECEIVED' });
    appendEvent(db, ev);
    expect(() => appendEvent(db, ev)).toThrow();
  });

  it('payload round-trip preserves JSON fidelity', () => {
    const payload = JSON.stringify({ price: '50000.12345678', volume: '1.00000001', side: 'buy' });
    const ev: InsertEvent = {
      id: 'evt-json-1',
      runId: 'run-json',
      seq: 0,
      type: 'PAPER_ORDER_FILLED',
      source: 'broker',
      timestamp: '2024-01-01T00:00:00.000Z',
      payloadJson: payload,
      payloadHash: sha256(payload),
      previousHash: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    appendEvent(db, ev);
    const row = getEvent(db, 'evt-json-1')!;
    // Exact string equality — no floating-point drift
    expect(row.payloadJson).toBe(payload);
    expect(JSON.parse(row.payloadJson).price).toBe('50000.12345678');
  });
});

describe('projections', () => {
  it('projectRunSummary returns null for empty input', () => {
    expect(projectRunSummary([])).toBeNull();
  });

  it('projectRunSummary summarizes events correctly', () => {
    const runId = 'run-summary';
    const evts = makeChainedEvents(runId, 5);
    appendEvents(db, evts);

    const rows = replayRun(db, runId);
    const summary = projectRunSummary(rows)!;
    expect(summary.runId).toBe(runId);
    expect(summary.eventCount).toBe(5);
    expect(summary.firstSeq).toBe(0);
    expect(summary.lastSeq).toBe(4);
  });

  it('projectEventTypeCounts groups types correctly', () => {
    const runId = 'run-types';
    appendEvents(db, makeChainedEvents(runId, 10));
    const rows = replayRun(db, runId);

    const counts = projectEventTypeCounts(rows);
    const total = counts.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(10);

    // seq 0 = MARKET_TICK_RECEIVED (1), seq 1-4 = BAR_CLOSED (4), seq 5-9 = AGENT_DECISION_RECEIVED (5)
    const tick = counts.find((c) => c.type === 'MARKET_TICK_RECEIVED');
    const bar = counts.find((c) => c.type === 'BAR_CLOSED');
    const decision = counts.find((c) => c.type === 'AGENT_DECISION_RECEIVED');
    expect(tick?.count).toBe(1);
    expect(bar?.count).toBe(4);
    expect(decision?.count).toBe(5);
  });
});

describe('appendEventPayload + verifyHashChain', () => {
  it('automatically calculates sequence and chains hashes correctly', () => {
    const runId = 'auto-run';
    const ev1 = appendEventPayload(db, {
      runId,
      type: 'MARKET_TICK_RECEIVED',
      source: 'test',
      payload: { price: '50000', symbol: 'BTC-USD' },
    });

    const ev2 = appendEventPayload(db, {
      runId,
      type: 'BAR_CLOSED',
      source: 'test',
      payload: { close: '50100', symbol: 'BTC-USD' },
    });

    expect(ev1.seq).toBe(0);
    expect(ev1.previousHash).toBeNull();

    expect(ev2.seq).toBe(1);
    expect(ev2.previousHash).toBe(ev1.payloadHash);

    // Verify hash chain
    expect(verifyHashChain(db, runId)).toBe(true);

    // Corrupt the database by inserting a modified event or modifying in DB
    db.update(events)
      .set({ payloadJson: JSON.stringify({ price: '99999', symbol: 'BTC-USD' }) })
      .where(eq(events.id, ev1.id))
      .run();

    expect(verifyHashChain(db, runId)).toBe(false);
  });
});
