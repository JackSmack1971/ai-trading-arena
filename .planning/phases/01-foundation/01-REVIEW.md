---
phase: 01-foundation
reviewed: 2026-06-03T10:53:48Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - apps/api/src/index.ts
  - apps/worker/src/index.ts
  - packages/broker-paper/src/__tests__/risk-gate.test.ts
  - packages/core/src/__tests__/domain.test.ts
  - packages/core/src/__tests__/event-types.test.ts
  - packages/core/src/events/bus.ts
  - packages/core/src/events/types.ts
  - packages/core/src/index.ts
  - packages/core/src/interfaces.ts
  - packages/db/src/__tests__/events.test.ts
  - packages/db/src/repositories/events.ts
  - packages/telemetry/package.json
  - packages/telemetry/src/__tests__/logger.test.ts
  - packages/telemetry/src/index.ts
  - packages/telemetry/src/naming.ts
  - scripts/db-validate.ts
findings:
  critical: 6
  warning: 8
  info: 5
  total: 19
status: issues_found
---

# Phase 01-Foundation: Code Review Report

**Reviewed:** 2026-06-03T10:53:48Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase establishes the foundational simulator infrastructure: event sourcing, hash-chain
persistence, risk gate, Pino logging, OTel naming constants, and the API/worker entry points.
The domain schemas in `packages/core` and the DB repository structure are sound. The hash-chain
algorithm and Zod schema coverage are well-structured.

Six blockers were identified. The most severe: `appendEventPayload` performs an unguarded
read-then-write that is not wrapped in a SQLite transaction, making the hash chain non-atomic;
the deterministic event ID `evt-<runId>-<seq>` will cause a PRIMARY KEY collision on any
second-seed scenario; the `onEventType` bus method leaks un-removable listeners; wildcard CORS
exposes the state-mutating demo endpoint to any origin; the `runId` path segment is not validated
before DB use; and the `isEntry` guard uses fragile manual URL construction that silently fails
on Windows. Seven warnings cover logic gaps in risk-gate boundary tests, missing WebSocket
heartbeat, type-unsafe payload casts, and a `||` vs `??` fallback bug. Five info items cover
dead code, test coverage gaps, and logging hygiene.

---

## Critical Issues

### CR-01: `appendEventPayload` is not wrapped in a transaction — hash chain is non-atomic

**File:** `packages/db/src/repositories/events.ts:56-91`

**Issue:** The function reads the last event to derive `nextSeq` and `previousHash`, then inserts
the new event as two separate database operations. These are not wrapped in a `db.transaction()`.
Any concurrent call for the same `runId` — including future async paths, test helpers, or a
second process sharing a WAL file — will read the same `lastEvent`, compute the same `nextSeq`,
and one of the two inserts will fail with a `UNIQUE(run_id, seq)` constraint violation. The event
is silently lost from the caller's perspective because `createApiServer` wraps the POST handler
with only a generic `.catch` that responds with a 500. The hash chain is broken because the failed
insert leaves a gap in the `previousHash` linkage.

Even in the current single-process synchronous model, the absence of a transaction means a crash
between the SELECT and the INSERT leaves no record of the partially computed hash state.

**Fix:** Wrap the entire read + compute + insert in a Drizzle transaction:

```typescript
export function appendEventPayload(db: ArenaDb, params: { ... }): EventRow {
  return db.transaction(() => {
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
    const payloadHash = sha256(payloadJson + (previousHash ?? ''));
    const id = `evt-${params.runId}-${nextSeq}`;
    const createdAt = new Date().toISOString();
    const timestamp = params.timestamp ?? createdAt;
    const newEvent: InsertEvent = { id, runId: params.runId, seq: nextSeq, ... };
    db.insert(events).values(newEvent).run();
    return newEvent as EventRow;
  })();
}
```

---

### CR-02: Deterministic event ID causes PRIMARY KEY collision on any second-seed scenario

**File:** `packages/db/src/repositories/events.ts:71`

**Issue:** The event ID is derived as `evt-${params.runId}-${nextSeq}`. For a fixed `runId` such
as `'demo-local-paper-arena'`, the first event is always `evt-demo-local-paper-arena-0`. If the
same `runId` is ever used in a second `appendEventPayload` call (DB wiped and re-seeded, test
fixture calling against the same `runId`, or any path that bypasses the `seedDemoIfEmpty` guard),
the INSERT will throw a PRIMARY KEY violation. This is distinct from the UNIQUE(run_id, seq)
constraint — it is the `id` column itself. The event is silently not persisted; no error surfaces
to the API caller because the POST handler's `.catch` responds with a 500 and moves on.

**Fix:** Add a unique random suffix so IDs are guaranteed unique across restarts:

```typescript
import { randomUUID } from 'node:crypto';
const id = `evt-${params.runId}-${nextSeq}-${randomUUID().slice(0, 8)}`;
```

---

### CR-03: `SimEventBus.onEventType` creates un-removable listener wrappers — memory leak

**File:** `packages/core/src/events/bus.ts:22-26`

**Issue:**
```typescript
onEventType(type: SimEventType, listener: (event: SimEvent) => void): this {
  return this.on('event', (ev) => {
    if (ev.type === type) listener(ev);
  });
}
```
A new anonymous function is created on each call. The caller has only the original `listener`
reference, not the wrapper. `bus.off('event', listener)` will not remove the wrapper —
EventEmitter requires the exact function reference passed to `on`. Every call to `onEventType`
permanently adds a listener with no removal path. In long-running processes or tests that
instantiate the bus multiple times, wrappers accumulate and EventEmitter3 emits max-listener
warnings. This is a confirmed leak because no caller of `onEventType` anywhere in the codebase
can ever call `off`.

**Fix:** Return a disposer function:
```typescript
onEventType(type: SimEventType, listener: (event: SimEvent) => void): () => void {
  const wrapper = (ev: SimEvent) => { if (ev.type === type) listener(ev); };
  this.on('event', wrapper);
  return () => this.off('event', wrapper);
}
```

---

### CR-04: Wildcard CORS exposes state-mutating demo endpoint to any origin

**File:** `apps/api/src/index.ts:303-307`

**Issue:** `setCorsHeaders` unconditionally sets `Access-Control-Allow-Origin: *` on every HTTP
response, including the `POST /api/demo/run` endpoint that inserts demo events into the database.
A wildcard `*` header means any cross-origin web page can issue a cross-site POST that seeds the
arena DB without any CSRF protection. For a local-first tool this is a lower-severity risk today,
but it violates the project's security boundary principle (the simulator boundary must be
protected) and precludes any future use of credentials-carrying requests (`credentials: include`
requires a non-wildcard `Access-Control-Allow-Origin`).

**Fix:** Restrict to the configured dashboard origin:
```typescript
const ALLOWED_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', ALLOWED_ORIGIN);
  res.setHeader('vary', 'Origin');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}
```

---

### CR-05: `runId` from URL path is not validated before DB use

**File:** `apps/api/src/index.ts:125` and `apps/api/src/index.ts:164`

**Issue:** Both the WebSocket and HTTP handlers extract a `runId` from the URL path using
`decodeURIComponent` and then pass it directly to `replayRun`, `appendEventPayload`, and
`buildTelemetry`. No format validation is applied. A caller can supply:
- An empty string (WebSocket path `/ws/runs//telemetry` yields `split('/')[3] === ''`)
- Excessively long strings that bloat SQL parameters
- Percent-encoded path traversal segments (e.g., `%2F%2F` decodes to `//`)

Drizzle uses parameterised queries so SQL injection is not possible, but the absence of any
schema-level gate means malformed `runId` values silently return empty results or
trigger unexpected DB behavior. The `RunIdSchema` from `@arena/core` already defines the allowed
format.

**Fix:** Validate immediately after extraction:
```typescript
import { RunIdSchema } from '@arena/core';

const rawRunId = decodeURIComponent(url.pathname.split('/')[3] ?? '');
const parseResult = RunIdSchema.safeParse(rawRunId);
if (!parseResult.success) {
  socket.destroy(); // or ws.close(1008, 'invalid run id')
  return;
}
const runId = parseResult.data;
```

---

### CR-06: `isEntry` guard uses manual URL string construction — silently fails on Windows

**File:** `apps/api/src/index.ts:568` and `apps/worker/src/index.ts:97`

**Issue:**
```typescript
const isEntry = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;
```
`process.argv[1]` on Windows contains a drive-letter path such as `C:\Users\...`. The manual
replacement of `\\` with `/` does not produce a valid file URL because `fileURLToPath`/
`pathToFileURL` also encode special characters, normalise drive-letter casing, and handle UNC
paths. If the comparison fails, `isEntry` is always `false`, and the `if (isEntry)` block that
starts the server/worker never runs. The process exits silently without starting. This is an
active risk given the project is running on Windows 11 (per the environment metadata).

**Fix:** Use Node's standard URL utility:
```typescript
import { pathToFileURL } from 'node:url';
const isEntry = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
```

---

## Warnings

### WR-01: WebSocket telemetry interval not cleared on server close — timer leak

**File:** `apps/api/src/index.ts:128-133`

**Issue:** The `setInterval` for telemetry snapshots is cleared only in the socket's `close`
handler. The `wss` has no `close` handler. When the HTTP server shuts down (graceful shutdown
in tests or production), WebSocket connections in a half-open or abruptly terminated state will
not reliably fire the socket `close` event, leaving the interval running indefinitely. The project
WebSocket rules require a 30 000 ms ping/pong heartbeat with `terminate()` on missed pong, which
is also absent.

**Fix:** Add a heartbeat and a server-close cleanup:
```typescript
const activeIntervals = new Set<ReturnType<typeof setInterval>>();
wss.on('connection', (ws: WebSocket, req) => {
  let isAlive = true;
  ws.on('pong', () => { isAlive = true; });
  const heartbeat = setInterval(() => {
    if (!isAlive) { ws.terminate(); return; }
    isAlive = false;
    ws.ping();
  }, 30_000);
  const telemetryInterval = setInterval(() => { ... }, 2_000);
  activeIntervals.add(heartbeat);
  activeIntervals.add(telemetryInterval);
  ws.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(telemetryInterval);
    activeIntervals.delete(heartbeat);
    activeIntervals.delete(telemetryInterval);
  });
});
wss.on('close', () => {
  for (const iv of activeIntervals) clearInterval(iv);
  activeIntervals.clear();
});
```

---

### WR-02: Risk gate test suite is missing required boundary tests for multiple rules

**File:** `packages/broker-paper/src/__tests__/risk-gate.test.ts`

**Issue:** The test file has boundary-value tests for `MAX_DRAWDOWN`, `NO_NEGATIVE_CASH`,
`MAX_SYMBOL_EXPOSURE`, and `MAX_TOTAL_EXPOSURE`. It has no tests at all for:
- `MAX_ORDERS_PER_MINUTE` (ordersThisMinute at limit, at limit+1)
- `MAX_STRATEGY_SWITCHES_PER_HOUR` (strategySwitchesThisHour at limit, at limit+1)
- `NO_REAL_EXECUTION` (executionMode='LIVE' and executionVenue='REAL' cases)
- `NO_LEVERAGE` (leverageMultiplier > 1)
- `MAX_POSITION_SIZE` (position pct at limit and one cent over)
- `evaluateStrategySwitch()` method — entirely untested

Per `.claude/rules/risk-gate-parameters.md`: "Add tests for each gate with passing and failing
cases covering position size, exposure, drawdown, order frequency, strategy-switch frequency,
negative cash, and leverage attempts."

**Fix:** Add describe blocks for each missing rule mirroring the existing boundary-value pattern.
Each rule needs at minimum: (1) a PASSED case where the counter equals the threshold exactly, and
(2) a REJECTED case where it is one over.

---

### WR-03: `decisionId` mismatch between persisted event and broker order breaks audit linkage

**File:** `apps/api/src/index.ts:442` and `apps/api/src/index.ts:461`

**Issue:** `appendDecision` persists `decisionId: \`decision-${agentId}-${observationId}\`` where
`observationId` has the form `obs-<agentId>-<tickIndex>` (e.g., `obs-agent-a-0`).
`applyDecisionThroughPaperBroker` sends to the broker `decisionId: \`decision-${agentId}-${tickIndex}\``
(e.g., `decision-agent-a-0`).

The resulting `AGENT_DECISION_RECEIVED` event and the `PAPER_ORDER_CREATED` event have different
`decisionId` values. Any post-run forensic join between the two events via `decisionId` will
silently find no match. Replayability and audit linkage are core project invariants.

**Fix:** Extract `decisionId` as a shared variable before both calls:
```typescript
const decisionId = `decision-${agent.agentId}-${observation.observationId}`;
appendDecision(db, runId, agent.agentId, observation.observationId, decision,
               tickEvent.exchangeTimestamp, decisionId);
applyDecisionThroughPaperBroker(broker, agent.agentId, decision, decisionId);
```
Thread `decisionId` through both functions so order and decision event share the same value.

---

### WR-04: `toEquityPoint` and `projectAgents` use unsafe double casts bypassing type safety

**File:** `apps/api/src/index.ts:223-224` and `apps/api/src/index.ts:240`

**Issue:** Both functions cast parsed payloads via `schema.parse(raw) as Record<string, unknown>`
then `payload['snapshot'] as Record<string, string>`. The inner cast asserts all snapshot values
are strings with no runtime verification. If a future schema change adds a numeric or boolean
field, the cast silently passes but downstream chart data produces incorrect string coercions.
Silently returning zeros for valid events will mask real data problems.

**Fix:** The root cause is that broker event types use `z.record(z.string(), z.unknown())` in
`SimEventPayloadSchemas`. Define a proper `PnLSnapshotCreatedWrapperSchema` and parse directly
rather than relying on the catch-all schema plus a cast.

---

### WR-05: `appendEventPayload` uses `||` instead of `??` for timestamp fallback

**File:** `packages/db/src/repositories/events.ts:73`

**Issue:**
```typescript
const timestamp = params.timestamp || createdAt;
```
`||` treats an empty string as falsy. A caller passing `timestamp: ''` (valid TypeScript `string`)
silently falls back to `createdAt` (current time) instead of surfacing the malformed value. This
corrupts replay ordering. The project's `exactOptionalPropertyTypes` flag means `timestamp?:
string` only accepts `string | undefined`, so the empty string case is a coding error — but it is
a silent one that `??` would equally not catch. Using `??` is correct semantics ("use default only
when null/undefined") and is the consistent pattern everywhere else in the codebase.

**Fix:**
```typescript
const timestamp = params.timestamp ?? createdAt;
```

---

### WR-06: `pino` loggers in API and worker bypass `@arena/telemetry` — missing redact paths

**File:** `apps/api/src/index.ts:26` and `apps/worker/src/index.ts:8`

**Issue:** Both create Pino loggers with `pino({ name: 'api' })` and `pino({ name: 'worker' })`
directly, bypassing the `createLogger` factory in `@arena/telemetry` that configures:
- `messageKey: 'message'`
- Full `redact.paths` covering `apiKey`, `input.messages`, `output.choices`, OpenRouter fields

API and worker log output will not redact credential fields when they appear in log context.
This violates the project's secret-isolation rule ("OPENROUTER_API_KEY ... never logged").

**Fix:**
```typescript
import { createLogger } from '@arena/telemetry';
const logger = createLogger('api'); // includes messageKey and redact.paths
```

---

### WR-07: `SimEventBus.nextSeq()` counter is disconnected from DB sequence — silent divergence

**File:** `packages/core/src/events/bus.ts:11-19`

**Issue:** `_seq` is an in-memory counter that resets to 0 on every bus instantiation. The DB
layer in `appendEventPayload` assigns its own sequence from `MAX(seq)+1`. The two counters are
completely independent. Any caller that uses `bus.nextSeq()` to assign a sequence number and then
persists the event will produce a sequence that diverges from the DB's authoritative counter after
the first restart. `nextSeq()` is never called inside the bus itself, making it effectively
unused dead code that could mislead future implementers into bypassing the DB-level sequence.

**Fix:** Remove `nextSeq()` from `SimEventBus` and add a doc comment clarifying that seq
assignment is owned by the persistence layer (`appendEventPayload`). If the bus needs to track
in-memory ordering for non-persisted events, name it `ephemeralSeq()` to signal it is not the
authoritative DB sequence.

---

### WR-08: `countEvents` loads all row data for a count — full scan instead of COUNT aggregate

**File:** `packages/db/src/repositories/events.ts:32-39`

**Issue:**
```typescript
const rows = db.select({ seq: events.seq }).from(events).where(eq(events.runId, runId)).all();
return rows.length;
```
This materialises all row `seq` values in memory to count them. SQLite's `COUNT(*)` does this
natively via the index. While the call is not on the hot path today, the function is exported and
is called by `seedDemoIfEmpty` on every telemetry request via `replayRun(db, runId).length === 0`.

**Fix:**
```typescript
import { count } from 'drizzle-orm';

export function countEvents(db: ArenaDb, runId: string): number {
  const result = db.select({ total: count() }).from(events)
    .where(eq(events.runId, runId)).get();
  return result?.total ?? 0;
}
```

---

## Info

### IN-01: `buildTelemetry` causes a double `replayRun` on every request

**File:** `apps/api/src/index.ts:78-97`

**Issue:** `buildTelemetry` calls `seedDemoIfEmpty` (line 79), which calls `replayRun` to check
if the DB is empty (line 192), then `buildTelemetry` calls `replayRun` again on line 80. Every
telemetry request — HTTP or WebSocket, every 2 seconds — issues two full table-scan queries for
the same `runId`. Once seeded, the `seedDemoIfEmpty` check is a no-op that still costs a full
scan per request.

**Fix:** Remove the `seedDemoIfEmpty` call from `buildTelemetry`. Seed only from routes that
require it (`POST /api/demo/run`, `GET /api/runs/:id/events`).

---

### IN-02: `telemetry` package exports raw `.ts` source — will fail in compiled consumers

**File:** `packages/telemetry/package.json:6-8`

**Issue:**
```json
"exports": { ".": "./src/index.ts" }
```
This works only with a bundler or TypeScript path-mapped resolution. Any consumer that resolves
through the `exports` map in a compiled (`.js`) context (e.g., Docker build, `pnpm deploy`) will
fail to load because `./src/index.ts` is a TypeScript file. The `build` script emits to `dist/`
via `tsup` but the exports map never references `dist/`.

**Fix:** Add conditional exports:
```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "default": "./src/index.ts"
  }
}
```

---

### IN-03: `event-types.test.ts` has no negative payload validation tests

**File:** `packages/core/src/__tests__/event-types.test.ts`

**Issue:** The test verifies that `SimEventPayloadSchemas` keys match `SimEventTypeSchema.options`
and that a valid `MARKET_TICK_RECEIVED` tick parses. No negative tests exist for invalid payloads
(missing required fields, wrong types, extra keys). Only `StrategySwitchRequestedPayloadSchema`
has a rejection test. Project rules require at least one negative `safeParse` failure assertion
for each public schema boundary.

**Fix:** Add at minimum one negative test per payload schema — e.g., missing `eventId` for
`MARKET_TICK_RECEIVED`, wrong type for `latencyMs`, empty `agentId` for
`AGENT_DECISION_REQUESTED`.

---

### IN-04: `scripts/db-validate.ts` exits 0 on empty run — CI cannot detect failed seeding

**File:** `scripts/db-validate.ts:15-18`

**Issue:** When no events are found for the specified `runId`, the script writes a warning and
exits with code 0. A CI step that runs `pnpm db:validate` after seeding would silently appear to
succeed even when the seed failed and the DB is empty. Exit code 0 should mean "validated OK",
not "nothing to validate".

**Fix:**
```typescript
if (rows.length === 0) {
  process.stderr.write(`No events found for run "${runId}" in ${dbPath}\n`);
  process.exit(2); // distinct: 0=OK, 1=validation failures, 2=run not found
}
```

---

### IN-05: `--passWithNoTests` in telemetry test script hides future test-discovery failures

**File:** `packages/telemetry/package.json:14`

**Issue:** `"test": "vitest run --passWithNoTests"` — since `logger.test.ts` already exists, this
flag is no longer needed and silently masks any future situation where test files are deleted or
fail to be discovered (e.g., wrong `include` glob, missing file extension).

**Fix:** Remove the flag:
```json
"test": "vitest run"
```

---

_Reviewed: 2026-06-03T10:53:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
