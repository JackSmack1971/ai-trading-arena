import { asc, eq } from 'drizzle-orm';
import type { ArenaDb } from '../client.js';
import { events, type EventRow, type InsertEvent } from '../schema.js';

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
