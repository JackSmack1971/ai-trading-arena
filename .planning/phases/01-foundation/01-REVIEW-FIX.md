---
phase: 01-foundation
fixed_at: 2026-06-03T07:25:30Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 14
fixed: 13
skipped: 1
status: partial
---

# Phase 01-Foundation: Code Review Fix Report

**Fixed at:** 2026-06-03T07:25:30Z
**Source review:** `.planning/phases/01-foundation/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 14 (6 Critical + 8 Warning)
- Fixed: 13
- Skipped: 1

---

## Fixed Issues

### CR-01: appendEventPayload is not wrapped in a transaction

**Files modified:** `packages/db/src/repositories/events.ts`
**Commit:** `00ea4e0`
**Applied fix:** Wrapped the entire read+compute+insert in `db.transaction((tx) => { ... })` using Drizzle's sync transaction API (the callback form, not the `()()` form suggested in the review which does not match the Drizzle better-sqlite3 type signature). All SELECT and INSERT operations inside `appendEventPayload` now operate on the transaction `tx` object, making the hash chain atomic.

---

### CR-02: Deterministic event ID causes PRIMARY KEY collision on re-seed

**Files modified:** `packages/db/src/repositories/events.ts`
**Commit:** `00ea4e0`
**Applied fix:** Added `import { randomUUID } from 'node:crypto'` and changed event ID construction to `evt-${params.runId}-${nextSeq}-${randomUUID().slice(0, 8)}`. Applied in the same commit as CR-01 since both affect the same lines.

---

### CR-03: SimEventBus.onEventType creates un-removable listener wrappers

**Files modified:** `packages/core/src/events/bus.ts`
**Commit:** `3f93a72`
**Applied fix:** Changed `onEventType` return type from `this` to `() => void`. Stores the anonymous wrapper in a named `wrapper` variable, registers it with `this.on`, and returns `() => this.off('event', wrapper)`. Callers can now remove listeners by calling the returned disposer.

---

### CR-04: Wildcard CORS exposes state-mutating endpoint to any origin

**Files modified:** `apps/api/src/index.ts`
**Commit:** `56f67ca`
**Applied fix:** Removed `import { pino }`. Added `const ALLOWED_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173'`. Updated `setCorsHeaders` to use `ALLOWED_ORIGIN` instead of `'*'` and added `res.setHeader('vary', 'Origin')`.

---

### CR-05: runId from URL path is not validated before DB use

**Files modified:** `apps/api/src/index.ts`
**Commit:** `56f67ca`
**Applied fix:** Added `RunIdSchema` to the `@arena/core` import. In the WebSocket connection handler, extracts `rawRunId` then calls `RunIdSchema.safeParse(rawRunId)` — on failure, closes the socket with code 1008 and returns. In the HTTP route handler for `/api/runs/:id/*`, validates `rawRunId` with `RunIdSchema.safeParse` — on failure, returns 400 `invalid_run_id`.

---

### CR-06: isEntry guard uses manual URL string construction — silently fails on Windows

**Files modified:** `apps/api/src/index.ts`, `apps/worker/src/index.ts`
**Commit:** `56f67ca` (api), `fe3febc` (worker)
**Applied fix:** Added `pathToFileURL` to the `node:url` import in both files. Replaced `` `file://${process.argv[1]?.replace(/\\/g, '/')}` `` with `pathToFileURL(process.argv[1] ?? '').href` in both files.

---

### WR-01: WebSocket telemetry interval not cleared on server close — timer leak

**Files modified:** `apps/api/src/index.ts`
**Commit:** `56f67ca`
**Applied fix:** Added `const activeIntervals = new Set<ReturnType<typeof setInterval>>()` inside `createApiServer`. Added `isAlive` flag with `ws.on('pong', () => { isAlive = true })` and a 30-second `heartbeat` interval that pings and terminates unresponsive sockets. Replaced the single `interval` with separate `heartbeat` and `telemetryInterval` — both added to `activeIntervals`. Updated the `ws.on('close')` handler to clear and delete both. Added `wss.on('close', () => { for (const iv of activeIntervals) clearInterval(iv); activeIntervals.clear(); })`.

---

### WR-02: Risk gate test suite is missing required boundary tests for multiple rules

**Files modified:** `packages/broker-paper/src/__tests__/risk-gate.test.ts`
**Commit:** `17f5c48`
**Applied fix:** Added 6 new `describe` blocks covering all previously untested rules:
- `MAX_ORDERS_PER_MINUTE`: at-limit (5) passes, limit+1 (6) rejects
- `MAX_STRATEGY_SWITCHES_PER_HOUR` via `evaluateOrder`: at-limit (3) passes, limit+1 (4) rejects
- `NO_REAL_EXECUTION`: PAPER/PAPER passes, LIVE rejects, REAL venue rejects
- `NO_LEVERAGE`: undefined/1 passes, 1.01 rejects
- `MAX_POSITION_SIZE`: 50% passes, 50%+1c rejects
- `evaluateStrategySwitch()`: at-limit (3) passes, limit+1 (4) rejects

Total: 22 tests (previously 8), all green.

---

### WR-03: decisionId mismatch between persisted event and broker order breaks audit linkage

**Files modified:** `apps/api/src/index.ts`
**Commit:** `56f67ca`
**Applied fix:** Extracted `const decisionId = \`decision-${agent.agentId}-${observation.observationId}\`` as a shared variable before both calls. Updated `appendDecision` signature to accept `decisionId: string` as the last parameter instead of constructing it internally. Updated `applyDecisionThroughPaperBroker` to accept `decisionId: string` instead of `tickIndex: number`, using `decisionId` for both the `orderId` suffix and the `decisionId` field. Both events now share the same `decisionId` value.

**Note:** This fix changes the `orderId` format from `paper-${agentId}-${tickIndex}` to `paper-${agentId}-${decisionId}`. This is more descriptive and links the order to its decision. Existing demo data in the DB will reflect the old format; re-seeding will use the new format.

---

### WR-04 — Skipped (see below)

---

### WR-05: appendEventPayload uses `||` instead of `??` for timestamp fallback

**Files modified:** `packages/db/src/repositories/events.ts`
**Commit:** `00ea4e0`
**Applied fix:** Changed `params.timestamp || createdAt` to `params.timestamp ?? createdAt` on line 84. Applied in the same commit as CR-01/CR-02.

---

### WR-06: pino loggers in API and worker bypass @arena/telemetry

**Files modified:** `apps/api/src/index.ts`, `apps/worker/src/index.ts`
**Commit:** `56f67ca` (api), `fe3febc` (worker)
**Applied fix:** Removed `import { pino } from 'pino'` from both files. Added `import { createLogger } from '@arena/telemetry'`. Changed `pino({ name: 'api' })` to `createLogger('api')` and `pino({ name: 'worker' })` to `createLogger('worker')`. Both loggers now use the factory that configures `messageKey: 'message'` and the full `redact.paths` list.

---

### WR-07: SimEventBus.nextSeq() counter is disconnected from DB sequence

**Files modified:** `packages/core/src/events/bus.ts`
**Commit:** `3f93a72`
**Applied fix:** Renamed `nextSeq()` to `ephemeralSeq()` and renamed the private field `_seq` to `_ephemeralSeq`. Added a doc comment explicitly stating this counter is NOT the authoritative DB sequence and documenting that `appendEventPayload` owns the persisted sequence. Applied in the same commit as CR-03.

---

### WR-08: countEvents loads all row data for a count

**Files modified:** `packages/db/src/repositories/events.ts`
**Commit:** `00ea4e0`
**Applied fix:** Added `count` to the `drizzle-orm` import. Replaced the `db.select({ seq: events.seq }).from(events)...all()` + `.length` pattern with `db.select({ total: count() }).from(events)...get()` + `result?.total ?? 0`. SQLite now computes the COUNT natively without materialising rows.

---

## Skipped Issues

### WR-04: toEquityPoint and projectAgents use unsafe double casts bypassing type safety

**File:** `apps/api/src/index.ts:223-224`, `apps/api/src/index.ts:240`
**Reason:** The root fix requires defining a `PnLSnapshotCreatedWrapperSchema` in `packages/core/src/events/types.ts` with a typed `snapshot` sub-object, then re-exporting it from `packages/core/src/index.ts`, then updating `SimEventPayloadSchemas` to use it, and then updating both `toEquityPoint` and `projectAgents` in `apps/api` to parse through the new schema instead of the catch-all cast. This is a multi-file schema refactor touching the core domain contracts package and would require careful alignment with the existing `PnLSnapshotPayloadSchema`. Skipped to avoid unintended schema drift — requires coordinated schema design in a dedicated phase.
**Original issue:** `toEquityPoint` and `projectAgents` cast parsed payloads via `schema.parse(raw) as Record<string, unknown>` then `payload['snapshot'] as Record<string, string>`, bypassing type safety.

---

_Fixed: 2026-06-03T07:25:30Z_
_Fixer: Claude Sonnet 4.6 (gsd-code-fixer)_
_Iteration: 1_
