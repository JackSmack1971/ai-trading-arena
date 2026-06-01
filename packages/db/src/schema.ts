import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Append-only event log — the source of truth for all simulator state.
// Never UPDATE or DELETE rows; projections read forward from seq=0.
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    seq: integer('seq').notNull(),
    type: text('type').notNull(),
    source: text('source').notNull(),
    timestamp: text('timestamp').notNull(),
    payloadJson: text('payload_json').notNull(),
    payloadHash: text('payload_hash').notNull(),
    previousHash: text('previous_hash'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('events_run_seq_unique').on(t.runId, t.seq)],
);

export type EventRow = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
