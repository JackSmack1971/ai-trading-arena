import { createHash } from 'node:crypto';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import type { ArenaDb } from '../client.js';
import { events, type EventRow, type InsertEvent } from '../schema.js';

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function appendEvent(db: ArenaDb, event: InsertEvent): void {
  db.insert(events).values(event).run();
}

export function appendEvents(db: ArenaDb, batch: InsertEvent[]): void {
  if (batch.length === 0) return;
  db.insert(events).values(batch).run();
}

export function replayRun(db: ArenaDb, runId: string): EventRow[] {
  return db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(asc(events.seq))
    .all();
}

export function getEvent(db: ArenaDb, id: string): EventRow | undefined {
  return db.select().from(events).where(eq(events.id, id)).get();
}

export function countEvents(db: ArenaDb, runId: string): number {
  const rows = db
    .select({ seq: events.seq })
    .from(events)
    .where(eq(events.runId, runId))
    .all();
  return rows.length;
}

/**
 * Appends a new event payload to the log.
 * Resolves the next sequence number (seq) and computes the hash chain
 * (payloadHash = sha256(payloadJson + previousHash)).
 */
export function appendEventPayload(
  db: ArenaDb,
  params: {
    runId: string;
    type: string;
    source: string;
    payload: Record<string, unknown>;
    timestamp?: string;
  }
): EventRow {
  const lastEvent = db
    .select()
    .from(events)
    .where(eq(events.runId, params.runId))
    .orderBy(desc(events.seq))
    .limit(1)
    .get();

  const nextSeq = lastEvent ? lastEvent.seq + 1 : 0;
  const previousHash = lastEvent ? lastEvent.payloadHash : null;

  const payloadJson = JSON.stringify(params.payload);
  const hashInput = payloadJson + (previousHash ?? '');
  const payloadHash = sha256(hashInput);

  const id = `evt-${params.runId}-${nextSeq}`;
  const createdAt = new Date().toISOString();
  const timestamp = params.timestamp || createdAt;

  const newEvent: InsertEvent = {
    id,
    runId: params.runId,
    seq: nextSeq,
    type: params.type,
    source: params.source,
    timestamp,
    payloadJson,
    payloadHash,
    previousHash,
    createdAt,
  };

  db.insert(events).values(newEvent).run();

  return newEvent as EventRow;
}

/**
 * Verifies that the hash chain is intact for a given runId.
 * Replays all events and re-calculates the hashes to ensure no tampering occurred.
 */
export function verifyHashChain(db: ArenaDb, runId: string): boolean {
  const runEvents = db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(asc(events.seq))
    .all();

  let expectedPrevHash: string | null = null;

  for (const ev of runEvents) {
    if (ev.previousHash !== expectedPrevHash) {
      return false;
    }
    const hashInput = ev.payloadJson + (expectedPrevHash ?? '');
    const calculatedHash = sha256(hashInput);
    if (ev.payloadHash !== calculatedHash) {
      return false;
    }
    expectedPrevHash = ev.payloadHash;
  }

  return true;
}

/**
 * Counts PAPER_ORDER_CREATED events for a given runId + agentId
 * within the last windowMs milliseconds. Used by the risk gate caller
 * to derive ordersThisMinute without coupling broker-paper to @arena/db.
 * (per D-07, D-08)
 */
export function countOrdersInWindow(
  db: ArenaDb,
  runId: string,
  agentId: string,
  windowMs: number,
): number {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const rows = db
    .select({ seq: events.seq })
    .from(events)
    .where(
      and(
        eq(events.runId, runId),
        eq(events.source, agentId),
        eq(events.type, 'PAPER_ORDER_CREATED'),
        gte(events.timestamp, cutoff),
      ),
    )
    .all();
  return rows.length;
}

/**
 * Counts STRATEGY_SWITCH_REQUESTED events for a given runId + agentId
 * within the last windowMs milliseconds. Used by the risk gate caller
 * to derive strategySwitchesThisHour. (per D-07, D-09)
 */
export function countStrategySwitchesInWindow(
  db: ArenaDb,
  runId: string,
  agentId: string,
  windowMs: number,
): number {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const rows = db
    .select({ seq: events.seq })
    .from(events)
    .where(
      and(
        eq(events.runId, runId),
        eq(events.source, agentId),
        eq(events.type, 'STRATEGY_SWITCH_REQUESTED'),
        gte(events.timestamp, cutoff),
      ),
    )
    .all();
  return rows.length;
}
