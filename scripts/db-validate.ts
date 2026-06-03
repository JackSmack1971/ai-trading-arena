// scripts/db-validate.ts
// Validates all stored events in arena.db against per-type Zod schemas.
// Usage: pnpm db:validate [runId]
// Exit 0: all rows pass. Exit 1: one or more rows fail.
import { existsSync } from 'node:fs';
import { createDb, replayRun } from '@arena/db';
import { SimEventPayloadSchemas, SimEventTypeSchema } from '@arena/core';
import type { SimEventType } from '@arena/core';

const dbPath = process.env['DB_FILE_NAME'] ?? 'arena.db';
const runId = process.argv[2] ?? 'demo-local-paper-arena';

if (dbPath !== ':memory:' && !existsSync(dbPath)) {
  process.stdout.write(`No database file found at ${dbPath}; nothing to validate for run "${runId}"\n`);
  process.exit(0);
}

const db = createDb(dbPath, { readonly: true });
const rows = replayRun(db, runId);

if (rows.length === 0) {
  process.stdout.write(`No events found for run "${runId}" in ${dbPath}\n`);
  process.exit(0);
}

// Build a Set of known SimEventType values for O(1) lookup.
const knownTypes = new Set<string>(SimEventTypeSchema.options);

let failures = 0;

for (const row of rows) {
  // Parse payloadJson first — a JSON parse failure is always a hard failure.
  let raw: unknown;
  try {
    raw = JSON.parse(row.payloadJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[FAIL] seq=${row.seq} type=${row.type} — JSON.parse error: ${message}\n`);
    failures++;
    continue;
  }

  // Unknown event types: warn but do not count as failure (forward-compat).
  if (!knownTypes.has(row.type)) {
    process.stderr.write(`[WARN] seq=${row.seq} type=${row.type} — not in SimEventTypeSchema, skipping\n`);
    continue;
  }

  const schema = SimEventPayloadSchemas[row.type as SimEventType];
  const result = schema.safeParse(raw);

  if (!result.success) {
    process.stderr.write(
      `[FAIL] seq=${row.seq} type=${row.type} — Zod issues: ${JSON.stringify(result.error.issues)}\n`,
    );
    failures++;
  }
}

if (failures > 0) {
  process.stderr.write(
    `\nValidation complete: ${failures} failure(s) in ${rows.length} events for run "${runId}"\n`,
  );
  process.exit(1);
} else {
  process.stdout.write(
    `Validation complete: ${rows.length} events validated OK for run "${runId}"\n`,
  );
  process.exit(0);
}
