# Phase 1: Foundation — Research

**Researched:** 2026-06-02
**Domain:** TypeScript monorepo infrastructure — structured logging, OTel naming constants, event-sourced risk counters, Zod payload parsing, feed adapter interface
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build the `@arena/telemetry` factory only in Phase 1. Do NOT update existing package loggers to import from `@arena/telemetry` yet. Existing loggers stay as-is.
- **D-02:** OTel scope is naming constants only — export string constants from `src/naming.ts`. No `NodeSDK`, no OTLP exporter, no SDK bootstrap.
- **D-03:** Pino `redact.paths` must implement the complete list from `.claude/rules/pino-logs.md`.
- **D-04:** Replay parse failure → throw and halt (not skip-and-continue).
- **D-05:** Phase 1 must include a `pnpm db:validate` smoke-test script.
- **D-06:** Per-event-type payload parse schemas live in `packages/core/src/events/types.ts`.
- **D-07:** Counter derivation stays in the caller layer (`apps/api`). `packages/broker-paper` must not gain a dependency on `@arena/db`.
- **D-08:** `ordersThisMinute` counts `PAPER_ORDER_CREATED` events with `timestamp >= now - 60s` for same `runId` and `agentId`.
- **D-09:** `strategySwitchesThisHour` requires a new `STRATEGY_SWITCH_REQUESTED` event type. Counter queries `timestamp >= now - 3600s`.
- **D-10:** `onError` is a required field on `MarketFeedAdapter` (not optional). Both adapters implement it in Phase 1.
- **D-11:** `onError` wires to existing terminal pattern: `pino.fatal` + stop all adapters + `process.exit(1)`.

### Claude's Discretion

None declared for Phase 1.

### Deferred Ideas (OUT OF SCOPE)

- Feed reconnect/retry on error via Bottleneck + p-retry — belongs in feed-adapter-hardening phase.
- `createTelemetrySdk()` factory with OTLP exporter — deferred to Phase 2+.
- Existing package logger migration to `@arena/telemetry` — deferred to Phase 2+.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | `packages/telemetry/src/index.ts` implements Pino root logger factory + OTel naming constants | Pino v9.14.0 factory patterns, redact.paths list, naming constants spec from rules |
| FOUND-02 | Risk gate counters derived from event log queries (not hardcoded 0) | Drizzle `and`/`gte`/`eq` filter patterns; windowed query design; new `STRATEGY_SWITCH_REQUESTED` event type |
| FOUND-03 | Zod per-type payload parsing replaces `JSON.parse as T` casts; `pnpm db:validate` script | Inventory of payload schema coverage; throw-and-halt pattern; script CLI design |
| FOUND-04 | `MarketFeedAdapter.onError` required; adapters implement it; unsafe cast removed | Interface diff; adapter implementation already partially present; worker cast removal |
</phase_requirements>

---

## Summary

Phase 1 is a pure infrastructure correctness pass on an already-working codebase. No new user-facing features are introduced. The four changes are targeted and bounded:

**FOUND-01** expands the empty `packages/telemetry/src/index.ts` stub into a Pino logger factory with complete redaction and an OTel naming constants file. No SDK initialization. Other packages will adopt it in Phase 2+.

**FOUND-02** fixes two hardcoded zeroes at lines 535-536 of `apps/api/src/index.ts` by adding two windowed query helpers to `packages/db/src/repositories/events.ts` and calling them at the `buildRiskState` call site. A new `STRATEGY_SWITCH_REQUESTED` enum value and payload schema are added to `packages/core/src/events/types.ts`.

**FOUND-03** replaces four `JSON.parse(row.payloadJson) as T` double-casts in `apps/api/src/index.ts` with explicit per-type Zod `parse()` calls. Missing payload schemas for the event types involved must first be added to `packages/core/src/events/types.ts`. A new root-level `pnpm db:validate` script validates all stored events.

**FOUND-04** adds `onError: (err: Error) => void` as a required method to the `MarketFeedAdapter` interface in `packages/core/src/interfaces.ts`. Both `CoinbaseFeedAdapter` and `BinanceFeedAdapter` already have `onError` as a class method (not on the interface) — the fix is purely additive to the interface. The unsafe cast in `apps/worker/src/index.ts` at line 51 is replaced with a direct call.

**Primary recommendation:** Implement the four requirements in dependency order: core schema changes first (FOUND-03 schema additions + FOUND-02 new event type), then the interface fix (FOUND-04), then the DB queries (FOUND-02), then the API call site fixes (FOUND-02 + FOUND-03), then the telemetry package (FOUND-01), then the validate script (FOUND-03).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pino logger factory | `packages/telemetry` | — | Shared infrastructure; other packages import the factory |
| OTel naming constants | `packages/telemetry/src/naming.ts` | — | Single source for all span/metric name strings |
| Risk counter derivation | `apps/api` (caller layer) | `packages/db` (query helpers) | D-07 locks counter assembly to caller; DB provides primitive query functions |
| Event payload schemas | `packages/core/src/events/types.ts` | — | D-06 locks schemas to core; DB and API import, never define |
| Per-type payload parsing | `apps/api/src/index.ts` (parse call sites) | — | Parsing happens at the application boundary; schema lives in core |
| MarketFeedAdapter interface | `packages/core/src/interfaces.ts` | — | Interface is the contract; adapters are implementations in `packages/feeds` |
| onError implementation | `packages/feeds/src/clients/` | `apps/worker/src/index.ts` (wiring) | Adapters own their error handler; worker wires to terminal pattern |
| db:validate script | `apps/db-validate/` or `scripts/` | `packages/db`, `packages/core` | CLI script; consumes both packages |

---

## Standard Stack

### Core — already installed, no new packages

| Library | Installed Version | Purpose |
|---------|------------------|---------|
| `pino` | `^9.5.0` (installed: 9.14.0) | Structured logger; used in `apps/api`, `apps/worker`, `packages/feeds`, `packages/strategies` |
| `drizzle-orm` | `^0.40.0` (installed: 0.40.1) | Query builder; `and`, `gte`, `eq` operators for windowed queries |
| `zod` | `^4.4.3` (installed: 4.4.3) | Schema validation; `z.object`, `z.enum`, `z.string().min(1)` for all schemas |
| `better-sqlite3` | `^11.3.0` | Synchronous SQLite driver; all queries are synchronous |

**Phase 1 adds no new npm dependencies.** The `packages/telemetry` package will need `pino` added to its `package.json` `dependencies`.

### Package Legitimacy Audit

No new packages are introduced in Phase 1. All libraries are already installed in the workspace.

| Package | Status |
|---------|--------|
| `pino` | Already installed — workspace `apps/api`, `apps/worker`, `packages/feeds` |
| `drizzle-orm` | Already installed |
| `zod` | Already installed |

---

## Architecture Patterns

### System Architecture Diagram

```
FOUND-01: packages/telemetry
  src/index.ts         → createLogger(name) factory  →  pino Logger
  src/naming.ts        → SPAN_NAMES, METRIC_NAMES,
                         ATTR_KEYS (string constants)

FOUND-02: Risk counter fix
  apps/api/src/index.ts
    buildRiskState()
      ordersThisMinute: 0   →  countOrdersInWindow(db, runId, agentId, 60s)
      strategySwitches: 0   →  countStrategySwitchesInWindow(db, runId, agentId, 3600s)
         ↓
  packages/db/src/repositories/events.ts  [two new helpers]
         ↓
  packages/core/src/events/types.ts  [new: STRATEGY_SWITCH_REQUESTED enum + schema]

FOUND-03: Payload parsing
  apps/api/src/index.ts
    toEnvelope()      JSON.parse as T  →  parseEventPayload(row)
    toMarketPoint()   JSON.parse as T  →  MarketTickPayloadSchema.parse(raw)
    toEquityPoint()   JSON.parse as T  →  PnLSnapshotPayloadSchema.parse(raw)
    projectAgents()   JSON.parse as T  →  per-type parse by row.type
         ↓
  packages/core/src/events/types.ts  [missing payload schemas added]

  scripts/db-validate.ts  [new script]
    reads arena.db → iterates all rows → per-type parse → report failures

FOUND-04: Interface fix
  packages/core/src/interfaces.ts
    MarketFeedAdapter  +  onError: (err: Error) => void  [required]
         ↓
  packages/feeds/src/clients/coinbase.ts   [onError() already on class — no change needed]
  packages/feeds/src/clients/binance.ts    [onError() already on class — no change needed]
  apps/worker/src/index.ts  line 51
    (adapter as unknown as { onError? })  →  adapter.onError(...)  [cast removed]
```

### Recommended Project Structure (additions only)

```
packages/telemetry/
  src/
    index.ts         # createLogger factory + re-exports naming constants
    naming.ts        # SPAN_NAMES, METRIC_NAMES, ATTR_KEYS constants

scripts/
  db-validate.ts     # pnpm db:validate smoke-test script
```

---

## Exact File Change List

### 1. `packages/core/src/events/types.ts`

**Changes:**

a. Add `'STRATEGY_SWITCH_REQUESTED'` to `SimEventTypeSchema` enum (after `'STRATEGY_SWITCHED'`, before `'RATE_LIMIT_DELAYED'`).

b. Add `StrategySwitchRequestedPayloadSchema` after the existing `StrategySwitchedPayloadSchema` block:

```typescript
export const StrategySwitchRequestedPayloadSchema = z.object({
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  fromStrategyId: StrategyIdSchema,
  toStrategyId: StrategyIdSchema,
  timestamp: TimestampSchema,
});
export type StrategySwitchRequestedPayload = z.infer<typeof StrategySwitchRequestedPayloadSchema>;
```

Note: `StrategyIdSchema` is already imported from `'../schemas/common.js'` (it exists in `common.ts`). `RunIdSchema` and `AgentIdSchema` are also already imported.

c. Add per-type payload dispatch schemas. The goal (D-04 / FOUND-03) is that `apps/api` can call a single function or use a lookup to parse a raw JSON object by event type. The cleanest pattern is a type-safe lookup map:

```typescript
// Per-type payload schemas for replay validation.
// Source: packages/core/src/events/types.ts
export const SimEventPayloadSchemas = {
  MARKET_TICK_RECEIVED: MarketTickPayloadSchema,
  ORDERBOOK_UPDATED: z.record(z.unknown()),           // no typed schema yet — permissive
  BAR_CLOSED: z.record(z.unknown()),                  // no typed schema yet — permissive
  STRATEGY_SIGNAL_CREATED: StrategySignalPayloadSchema,
  AGENT_DECISION_REQUESTED: AgentDecisionRequestedPayloadSchema,
  AGENT_DECISION_RECEIVED: AgentDecisionReceivedPayloadSchema,
  AGENT_DECISION_INVALID: AgentDecisionInvalidPayloadSchema,
  RISK_CHECK_PASSED: RiskCheckPayloadSchema,
  RISK_CHECK_REJECTED: RiskCheckPayloadSchema,
  PAPER_ORDER_CREATED: PaperOrderPayloadSchema,
  PAPER_ORDER_AMENDED: PaperOrderPayloadSchema,
  PAPER_ORDER_CANCELLED: PaperOrderPayloadSchema,
  PAPER_ORDER_REJECTED: PaperOrderPayloadSchema,
  PAPER_ORDER_FILLED: PaperFillPayloadSchema,
  POSITION_UPDATED: PositionUpdatedPayloadSchema,
  PNL_SNAPSHOT_CREATED: PnLSnapshotPayloadSchema,
  STRATEGY_SWITCHED: StrategySwitchedPayloadSchema,
  STRATEGY_SWITCH_REQUESTED: StrategySwitchRequestedPayloadSchema,
  RATE_LIMIT_DELAYED: RateLimitDelayedPayloadSchema,
  FEED_DISCONNECTED: FeedConnectionPayloadSchema,
  FEED_RECONNECTED: FeedConnectionPayloadSchema,
} as const satisfies Record<SimEventType, z.ZodTypeAny>;
```

Key Zod v4 note: `z.record(z.unknown())` is the correct permissive fallback in Zod v4 (replaces `z.object({}).passthrough()` for open-ended records). For event types without a precise schema yet (`ORDERBOOK_UPDATED`, `BAR_CLOSED`), use this pattern so the lookup always has an entry.

d. Export `StrategySwitchRequestedPayloadSchema`, `StrategySwitchRequestedPayload`, and `SimEventPayloadSchemas` from `packages/core/src/index.ts`.

**Imports to add in `types.ts`:** `StrategyIdSchema` from `'../schemas/common.js'` — verify it is already imported (it is listed in `common.ts` as `StrategyIdSchema`). If not already imported in the `types.ts` import line, add it.

### 2. `packages/core/src/index.ts`

**Changes:**

Add to the events sourcing export block:
```typescript
export {
  // ...existing...
  StrategySwitchRequestedPayloadSchema,
  SimEventPayloadSchemas,
} from './events/types.js';
export type {
  // ...existing...
  StrategySwitchRequestedPayload,
} from './events/types.js';
```

### 3. `packages/core/src/interfaces.ts`

**Changes:**

Add `onError` as a required method to `MarketFeedAdapter`:

```typescript
export interface MarketFeedAdapter {
  readonly id: string;
  readonly name: string;
  readonly authRequired: false;
  readonly capabilities: FeedCapability[];
  readonly ratePolicy: RatePolicy;

  connect(config: FeedConfig): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): Promise<void>;
  onEvent(handler: (event: NormalizedMarketEvent) => void): void;
  onError(handler: (err: Error) => void): void;   // ADD THIS LINE
}
```

**Impact check:** Both `CoinbaseFeedAdapter` and `BinanceFeedAdapter` already have `onError(handler: (err: Error) => void): void` as a class method. TypeScript will now enforce the interface requirement — no body changes needed in the adapters. The unsafe cast in `apps/worker/src/index.ts` is what needs to change.

### 4. `packages/feeds/src/clients/coinbase.ts`

**No code changes required.** The class already has `onError(handler: (err: Error) => void): void` as a public method. When `packages/core/src/interfaces.ts` gains the required `onError`, TypeScript will confirm the existing implementation satisfies it automatically.

**Verification:** Lines 226-228 of `coinbase.ts` already implement `onError`. Lines 142-154 already call `this.errorHandler?.(err)` on reconnect exhaustion.

### 5. `packages/feeds/src/clients/binance.ts`

**No code changes required.** Same reasoning as Coinbase — lines 238-240 already implement `onError`. Lines 155-163 already call `this.errorHandler?.(err)`.

### 6. `apps/worker/src/index.ts`

**Change at line 51:** Remove the unsafe cast. The current code:

```typescript
// BEFORE (lines 51-58):
(adapter as unknown as { onError?: (handler: (err: Error) => void) => void }).onError?.((err) => {
  logger.error({ err, adapterId: adapter.id }, 'feed adapter terminal error');
  if (stopFn) {
    void stopFn().catch(() => {});
  }
  opts?.onTerminalError?.(err);
});
```

Replace with direct call (no cast, no optional chain since `onError` is now required):

```typescript
// AFTER:
adapter.onError((err) => {
  logger.fatal({ err, adapterId: adapter.id }, 'feed adapter terminal error — stopping all adapters');
  if (stopFn) {
    void stopFn().catch(() => {});
  }
  opts?.onTerminalError?.(err);
});
```

Note: change `logger.error` to `logger.fatal` per D-11 (terminal errors use `fatal` per pino-logs.md rule) and per the existing `main()` pattern at line 114 which already uses `logger.fatal`.

### 7. `packages/db/src/repositories/events.ts`

**Add two new exported functions** after the existing `verifyHashChain` function:

```typescript
import { and, eq, gte } from 'drizzle-orm';
// (add gte to the existing drizzle-orm import at line 2)

/**
 * Counts PAPER_ORDER_CREATED events for a given runId + agentId
 * within the last windowMs milliseconds.
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
 * within the last windowMs milliseconds.
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
```

**Key design note:** The query uses `events.source` as the `agentId` filter. This is correct because `appendEventPayload` is called with `source: agentId` for all broker and decision events (confirmed in `apps/api/src/index.ts` lines 350-358, 426-441). The `PAPER_ORDER_CREATED` event is appended via `appendBrokerEvent(db, runId, agent.agentId, event)` with `source: agentId`.

**Import change:** Add `gte` to the existing `drizzle-orm` import at line 2: `import { asc, desc, eq, and, gte } from 'drizzle-orm';`.

**Export:** Add both functions to `packages/db/src/index.ts` via the existing `export * from './repositories/events.js'` barrel — no extra action required since the barrel re-exports everything.

### 8. `apps/api/src/index.ts`

**Change 1 — `buildRiskState` function (lines 527-539):**

```typescript
// BEFORE:
function buildRiskState(runId: string, agentId: string, portfolio: PortfolioSummary, timestamp: string): RiskState {
  return {
    runId,
    agentId,
    currentDrawdownPct: portfolio.currentDrawdownPct,
    maxDrawdownPct: '5',
    positionValueUsd: portfolio.totalPositionValue,
    totalExposurePct: portfolio.exposurePct,
    ordersThisMinute: 0,           // ← HARDCODED
    strategySwitchesThisHour: 0,   // ← HARDCODED
    lastEvaluatedAt: timestamp,
  };
}
```

```typescript
// AFTER:
function buildRiskState(
  db: ArenaDb,
  runId: string,
  agentId: string,
  portfolio: PortfolioSummary,
  timestamp: string,
): RiskState {
  return {
    runId,
    agentId,
    currentDrawdownPct: portfolio.currentDrawdownPct,
    maxDrawdownPct: '5',
    positionValueUsd: portfolio.totalPositionValue,
    totalExposurePct: portfolio.exposurePct,
    ordersThisMinute: countOrdersInWindow(db, runId, agentId, 60_000),
    strategySwitchesThisHour: countStrategySwitchesInWindow(db, runId, agentId, 3_600_000),
    lastEvaluatedAt: timestamp,
  };
}
```

Update the two call sites of `buildRiskState` within `buildObservation` to pass `db` as the first argument. `buildObservation` already receives `db`-adjacent context — but examining the actual call path: `buildObservation` is called from `runDeterministicDemo` where `db` is in scope. Pass `db` through `buildObservation` args or pass it to `buildRiskState` directly. The cleanest change is to update `buildObservation`'s parameter signature to add `db: ArenaDb` and pass it down.

**Import change for `apps/api`:** Add `countOrdersInWindow, countStrategySwitchesInWindow` to the `@arena/db` import at line 7.

**Change 2 — Payload parsing (four sites):**

Add import for `SimEventPayloadSchemas` from `@arena/core`:

```typescript
import {
  // ...existing imports...
  SimEventPayloadSchemas,
  type SimEventType,
} from '@arena/core';
```

Replace `toEnvelope` (line 194-202):

```typescript
// BEFORE:
function toEnvelope(row: EventRow): EventEnvelope {
  return {
    seq: row.seq,
    type: row.type,
    source: row.source,
    timestamp: row.timestamp,
    payload: JSON.parse(row.payloadJson) as unknown,
  };
}

// AFTER:
function toEnvelope(row: EventRow): EventEnvelope {
  const raw: unknown = JSON.parse(row.payloadJson);
  const schema = SimEventPayloadSchemas[row.type as SimEventType];
  const payload = schema
    ? schema.parse(raw)
    : raw;  // permissive fallback for unknown types
  return {
    seq: row.seq,
    type: row.type,
    source: row.source,
    timestamp: row.timestamp,
    payload,
  };
}
```

Replace `toMarketPoint` (lines 204-211) — uses `MarketTickPayloadSchema` directly:

```typescript
// AFTER:
import { MarketTickPayloadSchema, PnLSnapshotPayloadSchema } from '@arena/core';

function toMarketPoint(row: EventRow): ChartPoint {
  const raw: unknown = JSON.parse(row.payloadJson);
  const payload = MarketTickPayloadSchema.parse(raw);
  return {
    timestamp: row.timestamp,
    symbol: payload.symbol,
    price: payload.last ?? payload.close ?? '0',
  };
}
```

Replace `toEquityPoint` (lines 213-224) — uses `PnLSnapshotPayloadSchema`:

```typescript
// AFTER:
function toEquityPoint(row: EventRow): EquityPoint {
  const raw: unknown = JSON.parse(row.payloadJson);
  const payload = PnLSnapshotPayloadSchema.parse(raw);
  const snapshot = payload.snapshot;
  return {
    timestamp: row.timestamp,
    agentId: snapshot.agentId ?? row.source,
    equity: snapshot.equity ?? '0',
    cashBalance: snapshot.cashBalance ?? '0',
    exposurePct: snapshot.exposurePct ?? '0',
  };
}
```

Replace `projectAgents` loop (lines 227-276) — use `SimEventPayloadSchemas` lookup:

```typescript
// AFTER: inside the for(const row of rows) loop
const raw: unknown = JSON.parse(row.payloadJson);
const schema = SimEventPayloadSchemas[row.type as SimEventType];
const payload = schema ? schema.parse(raw) : (raw as Record<string, unknown>);
```

Note on D-04: Using `schema.parse(raw)` (not `safeParse`) means a corrupt stored row throws, halting the request. This is the mandated behavior. The caller in `buildTelemetry` → `replayRun` will surface the error up to the HTTP handler's try/catch which already logs `logger.error({ err }, 'http request failed')` and returns 500.

**Important:** The `PnLSnapshotPayloadSchema` shape needs to be verified. Looking at `packages/core/src/schemas/broker.ts`, the `PnLSnapshotSchema` is what `PnLSnapshotPayloadSchema` aliases. The existing `toEquityPoint` accesses `payload.snapshot.agentId` — the schema structure in the stored event is `{ snapshot: PnLSnapshot }` (wrapped). The `PnLSnapshotPayloadSchema = PnLSnapshotSchema` directly, so the stored payload has the snapshot fields directly (not nested). The existing accessor `payload['snapshot'] as Record<string, string>` appears to be wrong in the current code or the event is stored with a wrapper. This requires verification against the actual stored event structure from `appendBrokerEvent`. Looking at `appendBrokerEvent` → it persists `event as unknown as Record<string, unknown>` where `event` is a `BrokerEventPayload` discriminated union. For `PNL_SNAPSHOT_CREATED`, the broker event is `{ type: 'PNL_SNAPSHOT_CREATED', snapshot: PnLSnapshot }`. So the stored payload IS `{ type: '...', snapshot: { agentId: ..., equity: ... } }`. The current `toEquityPoint` is correct in accessing `payload.snapshot`. But `PnLSnapshotPayloadSchema = PnLSnapshotSchema` only matches the inner object, not the wrapper. This means `PnLSnapshotPayloadSchema.parse(raw)` would FAIL on the stored payload.

**Resolution:** For `toEquityPoint` specifically, do NOT use `PnLSnapshotPayloadSchema` directly. Use a discriminated parse or access the raw JSON object's `snapshot` property after a top-level safe structure check. The `SimEventPayloadSchemas` map entry for `PNL_SNAPSHOT_CREATED` must use the BrokerEventPayload schema shape (the full event), not just the inner snapshot. The planner must note this: either update `PnLSnapshotPayloadSchema` to be a wrapper `z.object({ type: z.literal('PNL_SNAPSHOT_CREATED'), snapshot: PnLSnapshotSchema })`, OR use `z.record(z.unknown())` as the permissive entry in `SimEventPayloadSchemas` for PNL and access the field with type narrowing.

**Practical recommendation:** For Phase 1, use the `SimEventPayloadSchemas` map with the existing schemas where they match (most event types), and use `z.record(z.unknown())` for the broker event types whose stored shape is `{ type, ...fields }` wrapper rather than the plain inner schema. The strict typed parsing can be tightened in a future phase when broker event schemas are updated to reflect their stored wrapper shape.

### 9. `packages/telemetry/src/index.ts`

Replace the empty stub with the Pino factory. The file must export:
- `createLogger(name: string): pino.Logger` — the root logger factory
- `createChildLogger` — convenience wrapper
- All naming constants from `./naming.js`

```typescript
// packages/telemetry/src/index.ts
import { pino } from 'pino';

export { pino };  // re-export so callers don't need a direct pino dep if using factory

export function createLogger(name: string): pino.Logger {
  return pino({
    name,
    messageKey: 'message',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'headers["x-api-key"]',
        'headers.authorization',
        'headers.cookie',
        'env.OPENROUTER_API_KEY',
        'apiKey',
        'input.messages',
        'output.choices',
        'request.messages',
        'response.choices',
        '*.apiKey',
        '*.api_key',
      ],
      censor: '[REDACTED]',
    },
  });
}

export function createChildLogger(
  parent: pino.Logger,
  bindings: Record<string, unknown>,
): pino.Logger {
  return parent.child(bindings);
}

export * from './naming.js';
```

**`packages/telemetry/package.json` addition:** Add `"pino": "^9.5.0"` to `dependencies`. This is the only new `package.json` change in Phase 1.

### 10. `packages/telemetry/src/naming.ts`

New file. Export string constants for span names, metric names, and attribute keys per `.claude/rules/opentelemetry-naming.md`:

```typescript
// packages/telemetry/src/naming.ts
// OpenTelemetry naming constants — string constants only, no SDK.
// Consumers import these to avoid magic strings in instrumented code.

/** Span name patterns for HTTP server routes (Fastify, Phase 2+) */
export const SPAN_NAMES = {
  // HTTP server — value: '{method} {route}' pattern
  HTTP_SERVER_REQUEST: (method: string, route: string) => `${method} ${route}`,

  // WebSocket channels
  WS_RECEIVE: (channel: string) => `WS RECEIVE ${channel}`,
  WS_SEND: (channel: string) => `WS SEND ${channel}`,

  // Database operations
  DB_QUERY: (operation: string, table: string) => `${operation} ${table}`,
  DB_QUERY_MULTI: (operation: string) => `${operation} sqlite`,

  // Feed operations
  FEED_SUBSCRIBE: 'feed.subscribe',
  FEED_RECONNECT: 'feed.reconnect',
  FEED_FETCH: 'feed.fetch',
  FEED_PARSE_BATCH: 'feed.parse_batch',
  FEED_PERSIST_BATCH: 'feed.persist_batch',

  // LLM / OpenRouter
  LLM_OPENROUTER_CHAT: 'llm.openrouter.chat',

  // Agent
  AGENT_DECISION: 'agent.decision',
} as const;

/** Metric instrument names (OTel semantic conventions + project-scoped) */
export const METRIC_NAMES = {
  // OTel stable HTTP metrics
  HTTP_SERVER_REQUEST_DURATION: 'http.server.request.duration',
  HTTP_CLIENT_REQUEST_DURATION: 'http.client.request.duration',

  // OTel stable database metric
  DB_CLIENT_OPERATION_DURATION: 'db.client.operation.duration',

  // Project-scoped histograms
  WS_MESSAGE_DURATION: 'app.ws.message.duration',
  AGENT_DECISION_DURATION: 'app.agent.decision.duration',

  // Project-scoped UpDownCounters
  WS_CONNECTION_COUNT: 'app.ws.connection.count',
  BOTTLENECK_QUEUE_COUNT: 'app.bottleneck.queue.count',
  FEED_SUBSCRIPTION_COUNT: 'app.feed.subscription.count',

  // Project-scoped Counters
  FEED_INGESTED_MESSAGES: 'app.feed.ingested.messages',
  WS_SENT_MESSAGES: 'app.ws.sent.messages',
  RETRY_FAILED_ATTEMPTS: 'app.retry.failed.attempts',
} as const;

/** OpenTelemetry attribute keys (OTel semantic conventions + project-scoped) */
export const ATTR_KEYS = {
  // HTTP
  HTTP_REQUEST_METHOD: 'http.request.method',
  HTTP_ROUTE: 'http.route',
  HTTP_RESPONSE_STATUS_CODE: 'http.response.status_code',
  URL_PATH: 'url.path',
  URL_SCHEME: 'url.scheme',
  SERVER_ADDRESS: 'server.address',
  SERVER_PORT: 'server.port',
  NETWORK_PROTOCOL_VERSION: 'network.protocol.version',

  // Database
  DB_SYSTEM_NAME: 'db.system.name',
  DB_NAMESPACE: 'db.namespace',
  DB_OPERATION_NAME: 'db.operation.name',
  DB_COLLECTION_NAME: 'db.collection.name',

  // Feed / App
  APP_FEED_SOURCE: 'app.feed.source',
  APP_MARKET_SYMBOL: 'app.market.symbol',
  APP_STRATEGY_NAME: 'app.strategy.name',
  APP_MONEY_SCALE: 'app.money.scale',

  // AI / OpenRouter
  APP_AI_PROVIDER: 'app.ai.provider',
  APP_AI_MODEL: 'app.ai.model',

  // Retry
  RETRY_ATTEMPT: 'retry.attempt',
  RETRY_DELAY_MS: 'retry.delay_ms',
  UPSTREAM_STATUS_CODE: 'upstream.status_code',
  RATE_LIMITER_PROVIDER: 'rate_limiter.provider',
  RATE_LIMITER_QUEUED: 'rate_limiter.queued',

  // DB literal value
  SQLITE: 'sqlite',
} as const;
```

### 11. `scripts/db-validate.ts` (new file)

The `pnpm db:validate` script reads `arena.db`, iterates all event rows, and runs each through `SimEventPayloadSchemas[row.type]`. Failure: print to stderr with row info, exit non-zero.

```typescript
// scripts/db-validate.ts
import { createDb, replayRun } from '@arena/db';
import { SimEventPayloadSchemas } from '@arena/core';
import type { SimEventType } from '@arena/core';

const dbPath = process.env['DB_FILE_NAME'] ?? 'arena.db';
const runId = process.argv[2] ?? 'demo-local-paper-arena';

const db = createDb(dbPath, { readonly: true });
const rows = replayRun(db, runId);

let failures = 0;

for (const row of rows) {
  const schema = SimEventPayloadSchemas[row.type as SimEventType];
  if (!schema) {
    process.stderr.write(`[WARN] seq=${row.seq} type=${row.type} — no schema registered, skipping\n`);
    continue;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(row.payloadJson);
  } catch {
    process.stderr.write(`[FAIL] seq=${row.seq} type=${row.type} — JSON.parse failed\n`);
    failures++;
    continue;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    process.stderr.write(
      `[FAIL] seq=${row.seq} type=${row.type} — Zod issues: ${JSON.stringify(result.error.issues)}\n`,
    );
    failures++;
  }
}

if (failures > 0) {
  process.stderr.write(`\nValidation complete: ${failures} failure(s) in ${rows.length} events for run "${runId}"\n`);
  process.exit(1);
} else {
  process.stdout.write(`Validation complete: ${rows.length} events validated OK for run "${runId}"\n`);
  process.exit(0);
}
```

Note: the validate script uses `safeParse` (not `parse`) — the script is a diagnostic tool, not a live path. D-04 (throw-and-halt) applies to the live `toEnvelope`/`toMarketPoint` paths in `apps/api`, not to the offline validate script.

**Root `package.json` addition:**

```json
"db:validate": "tsx scripts/db-validate.ts"
```

---

## Pino Factory Design

### Complete `redact.paths` Array

Per `.claude/rules/pino-logs.md` section "Redaction and Boundary Events":

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'headers["x-api-key"]',
    'headers.authorization',
    'headers.cookie',
    'env.OPENROUTER_API_KEY',
    'apiKey',
    'input.messages',
    'output.choices',
    // OpenRouter/OpenAI prompt and completion content
    'request.messages',
    'response.choices',
    '*.apiKey',
    '*.api_key',
  ],
  censor: '[REDACTED]',
}
```

The rule specifies: `req.headers.authorization`, `req.headers.cookie`, `res.headers.set-cookie`, `headers.x-api-key`, `env.OPENROUTER_API_KEY`, `apiKey`, `input.messages`, `output.choices`, and model prompt payload fields. [CITED: .claude/rules/pino-logs.md#Redaction-and-Boundary-Events]

### Factory Signature

```typescript
// Export type for callers that need to type the return value
import type { Logger } from 'pino';

export function createLogger(name: string): Logger;
export function createChildLogger(parent: Logger, bindings: Record<string, unknown>): Logger;
```

### Naming Convention for Child Logger Exports

Follow the established pattern in the codebase:

- `packages/feeds/src/logger.ts`: `export const feedLogger = pino({ name: 'feeds' })`
- `packages/strategies/src/logger.ts`: `export const strategyLogger = pino({ name: 'strategies' })`

Phase 1 does NOT migrate these files. The `createLogger` factory in `@arena/telemetry` is built so Phase 2+ can do: `export const feedLogger = createLogger('feeds')` as a drop-in replacement.

---

## OTel Naming Constants Design

Per `.claude/rules/opentelemetry-naming.md` [CITED]:

**Span names:** `{http.request.method} {http.route}` format for HTTP; `WS RECEIVE {channel}` / `WS SEND {channel}` for WebSocket; `{db.operation.name} {db.collection.name}` for database; `{db.operation.name} sqlite` for cross-table.

**Metric names:** OTel stable: `http.server.request.duration`, `http.client.request.duration`, `db.client.operation.duration`. Project-scoped histograms use `app.` prefix with singular nouns. UpDownCounters use `.count` suffix. Counters use plural nouns.

**Attribute keys:** Standard OTel keys (`http.request.method`, `db.system.name`, etc.) plus project-scoped `app.*` keys for feeds, strategies, AI, money.

The file path is `packages/telemetry/src/naming.ts` (project uses `@arena/telemetry` rather than a separate `packages/observability` package as the rule text suggests; this is the correct adaptation for this codebase).

---

## STRATEGY_SWITCH_REQUESTED Event Design

**Payload fields** (per `specifics` section of CONTEXT.md + D-09):

```typescript
export const StrategySwitchRequestedPayloadSchema = z.object({
  runId: RunIdSchema,
  agentId: AgentIdSchema,
  fromStrategyId: StrategyIdSchema,
  toStrategyId: StrategyIdSchema,
  timestamp: TimestampSchema,
});
export type StrategySwitchRequestedPayload = z.infer<typeof StrategySwitchRequestedPayloadSchema>;
```

All schemas imported from `'../schemas/common.js'` — `RunIdSchema`, `AgentIdSchema`, `StrategyIdSchema`, `TimestampSchema` are all already present in `common.ts`.

**Enum placement:** Add `'STRATEGY_SWITCH_REQUESTED'` between `'STRATEGY_SWITCHED'` and `'RATE_LIMIT_DELAYED'` in `SimEventTypeSchema`.

**Pattern conformity:** Matches `StrategySwitchedPayloadSchema` immediately above it. Both use stable IDs and a `reason`-free payload (the switch request payload has no `reason` — reason belongs on the result event `STRATEGY_SWITCHED`).

---

## Counter Query Design

### Drizzle Pattern for Windowed Queries

The `events` table has `timestamp TEXT NOT NULL` (ISO-8601 UTC). SQLite TEXT comparison of ISO-8601 strings is lexicographically correct for chronological ordering, so `gte(events.timestamp, cutoff)` works correctly with SQLite's text collation.

```typescript
// Drizzle-orm 0.40.x: and, eq, gte are all available from 'drizzle-orm'
import { and, eq, gte } from 'drizzle-orm';

const cutoff = new Date(Date.now() - windowMs).toISOString();
const rows = db
  .select({ seq: events.seq })
  .from(events)
  .where(
    and(
      eq(events.runId, runId),
      eq(events.source, agentId),   // source column = agentId for broker events
      eq(events.type, 'PAPER_ORDER_CREATED'),
      gte(events.timestamp, cutoff),
    ),
  )
  .all();
return rows.length;
```

[VERIFIED: npm registry — drizzle-orm 0.40.1 installed; `and`, `gte`, `eq` confirmed present via Node.js require check]

### Source Column = agentId

Confirmed by tracing `appendBrokerEvent` in `apps/api/src/index.ts`:
```
appendBrokerEvent(db, runId, agent.agentId, event)
→ appendEventPayload(db, { runId, type: event.type, source: agentId, payload: event, ... })
→ stored as events.source = agentId
```
So `eq(events.source, agentId)` is the correct filter for agent-scoped events.

### Window Constants

- `ordersThisMinute`: `windowMs = 60_000` (60 seconds)
- `strategySwitchesThisHour`: `windowMs = 3_600_000` (3600 seconds)

---

## Per-Type Payload Schema Inventory

Current state of `packages/core/src/events/types.ts`:

| Event Type | Has Payload Schema | Schema Name | Notes |
|------------|------------------|-------------|-------|
| `MARKET_TICK_RECEIVED` | YES | `MarketTickPayloadSchema` (= `NormalizedMarketEventSchema`) | Direct alias |
| `ORDERBOOK_UPDATED` | NO | — | No typed schema; use `z.record(z.unknown())` |
| `BAR_CLOSED` | NO | — | No typed schema; use `z.record(z.unknown())` |
| `STRATEGY_SIGNAL_CREATED` | YES | `StrategySignalPayloadSchema` | Direct alias |
| `AGENT_DECISION_REQUESTED` | YES | `AgentDecisionRequestedPayloadSchema` | Defined inline |
| `AGENT_DECISION_RECEIVED` | YES | `AgentDecisionReceivedPayloadSchema` | Defined inline |
| `AGENT_DECISION_INVALID` | YES | `AgentDecisionInvalidPayloadSchema` | Defined inline |
| `RISK_CHECK_PASSED` | YES | `RiskCheckPayloadSchema` (= `RiskEventSchema`) | Both PASSED and REJECTED use same schema |
| `RISK_CHECK_REJECTED` | YES | `RiskCheckPayloadSchema` | Same schema as PASSED |
| `PAPER_ORDER_CREATED` | YES* | `PaperOrderPayloadSchema` (= `PaperOrderSchema`) | * Stored as BrokerEvent wrapper `{ type, order }` — see broker wrapper caveat |
| `PAPER_ORDER_AMENDED` | YES* | `PaperOrderPayloadSchema` | * Same caveat |
| `PAPER_ORDER_CANCELLED` | YES* | `PaperOrderPayloadSchema` | * Same caveat |
| `PAPER_ORDER_REJECTED` | PARTIAL | — | Stored as `{ type, riskEvent }` wrapper |
| `PAPER_ORDER_FILLED` | YES* | `PaperFillPayloadSchema` | * Stored as `{ type, fill }` wrapper |
| `POSITION_UPDATED` | YES* | `PositionUpdatedPayloadSchema` | * Stored as `{ type, position }` wrapper |
| `PNL_SNAPSHOT_CREATED` | YES* | `PnLSnapshotPayloadSchema` | * Stored as `{ type, snapshot }` wrapper |
| `STRATEGY_SWITCHED` | YES | `StrategySwitchedPayloadSchema` | Defined inline |
| `STRATEGY_SWITCH_REQUESTED` | NEW | `StrategySwitchRequestedPayloadSchema` | Add in Phase 1 |
| `RATE_LIMIT_DELAYED` | YES | `RateLimitDelayedPayloadSchema` | Defined inline |
| `FEED_DISCONNECTED` | YES | `FeedConnectionPayloadSchema` | Shared with RECONNECTED |
| `FEED_RECONNECTED` | YES | `FeedConnectionPayloadSchema` | Shared with DISCONNECTED |

### Broker Wrapper Caveat

The broker event types (`PAPER_ORDER_*`, `PAPER_ORDER_FILLED`, `POSITION_UPDATED`, `PNL_SNAPSHOT_CREATED`) are stored via `appendBrokerEvent` which passes the full `BrokerEventPayload` discriminated union as the payload:

```
BrokerEventPayload = 
  | { type: 'PAPER_ORDER_CREATED', order: PaperOrder }
  | { type: 'PAPER_ORDER_FILLED', fill: PaperFill }
  | { type: 'POSITION_UPDATED', position: Position }
  | { type: 'PNL_SNAPSHOT_CREATED', snapshot: PnLSnapshot }
  | ...
```

The existing payload schemas (`PaperOrderPayloadSchema = PaperOrderSchema`) match the INNER object, not the outer wrapper. For the `SimEventPayloadSchemas` dispatch map, the safest Phase 1 approach for broker event types is to use `z.record(z.unknown())` (permissive) and tighten these in a future phase. The four sites in `apps/api` that currently access these with unsafe casts can continue to access the parsed plain object with appropriate field access — the parse step still removes the double-cast security hole.

**Recommendation for SimEventPayloadSchemas map entries for broker events:** Use `z.record(z.unknown())` for `PAPER_ORDER_CREATED`, `PAPER_ORDER_AMENDED`, `PAPER_ORDER_CANCELLED`, `PAPER_ORDER_REJECTED`, `PAPER_ORDER_FILLED`, `POSITION_UPDATED`, `PNL_SNAPSHOT_CREATED`. This still satisfies FOUND-03 (the unsafe `as T` cast is removed) while not introducing a schema mismatch failure. Tight schemas for these are a FOUND-03 follow-up.

---

## `db:validate` Script Design

### CLI Interface

```
pnpm db:validate [runId]

Arguments:
  runId   (optional) Run ID to validate. Default: 'demo-local-paper-arena'
          Read from process.argv[2]

Environment:
  DB_FILE_NAME   Path to SQLite file. Default: 'arena.db'
```

### Error Output Format

```
[FAIL] seq=12 type=PAPER_ORDER_CREATED — Zod issues: [{"code":"invalid_type","expected":"string","received":"number","path":["orderId"],"message":"Expected string, received number"}]
[FAIL] seq=47 type=MARKET_TICK_RECEIVED — JSON.parse failed

Validation complete: 2 failure(s) in 150 events for run "demo-local-paper-arena"
```

### Exit Code Behavior

- Exit 0: all rows pass (or no rows found)
- Exit 1: one or more rows fail Zod validation or JSON.parse

### Script Location

`scripts/db-validate.ts` — run via `tsx scripts/db-validate.ts` (tsx is already in the workspace devDependencies).

Root `package.json` scripts addition:
```json
"db:validate": "tsx scripts/db-validate.ts"
```

---

## `onError` Wiring Design

### Current State

Both `CoinbaseFeedAdapter` and `BinanceFeedAdapter`:
- Have `private errorHandler: ((err: Error) => void) | null = null`
- Have `onError(handler: (err: Error) => void): void { this.errorHandler = handler; }` as a public method
- Call `this.errorHandler?.(err)` in `handleReconnect()` when reconnect attempts are exhausted

The methods satisfy the interface requirement already. The interface just needs to declare them.

### Interface Addition

```typescript
// packages/core/src/interfaces.ts — add one line to MarketFeedAdapter
onError(handler: (err: Error) => void): void;
```

### Worker Cast Removal

`apps/worker/src/index.ts` line 51 current:

```typescript
(adapter as unknown as { onError?: (handler: (err: Error) => void) => void }).onError?.((err) => {
```

Replacement:

```typescript
adapter.onError((err) => {
```

The optional chain (`?.`) goes away because `onError` is now required on the interface. `MarketFeedAdapter` guarantees the method exists.

### Terminal Error Pattern (D-11)

The existing behavior in `main()` already matches D-11:
```typescript
handle = await runWorker({
  onTerminalError: (err) => {
    logger.fatal({ err }, 'irrecoverable feed error — exiting');
    void shutdown(1);  // process.exit(1)
  },
});
```

The cast removal does not change behavior. The error still flows:
`errorHandler(err)` → `opts?.onTerminalError?.(err)` → `logger.fatal` + `process.exit(1)`.

Change `logger.error` → `logger.fatal` inside the `onError` handler in `runWorker` (line 53) for consistency with the `pino-logs.md` rule: "Use `fatal` for process-ending startup, migration, telemetry, or shutdown failures."

---

## Zod v4 API Notes

This project uses **Zod 4.4.3** (confirmed: `node_modules/zod/package.json` version = `4.4.3`). [VERIFIED: npm registry — zod 4.4.3 installed]

Key Zod v4 patterns used in this project and applicable to Phase 1:

| Operation | Zod v4 API | Notes |
|-----------|-----------|-------|
| Object schema | `z.object({ ... })` | Unchanged from v3 |
| Enum | `z.enum(['A', 'B'])` | Unchanged |
| Record (permissive) | `z.record(z.unknown())` | `z.record(z.string(), z.unknown())` also works; first arg defaults to string |
| String with min | `z.string().min(1)` | Unchanged |
| Optional field | `z.string().optional()` | Unchanged |
| Type inference | `z.infer<typeof Schema>` | Unchanged |
| Parse (throw) | `schema.parse(value)` | Unchanged |
| SafeParse | `schema.safeParse(value)` | Returns `{ success, data, error }` — unchanged |
| Error shape in v4 | `result.error.issues` | `ZodError.issues` array — unchanged |
| `satisfies` constraint | `const x = { ... } as const satisfies Record<K, z.ZodTypeAny>` | TypeScript `satisfies` keyword (TS 4.9+); project is TS 5.4+ |

**No Zod v4-specific breaking changes** affect the patterns used in this phase. The schemas follow the same `z.object`, `z.enum`, `z.string().min(1)` patterns as all existing schemas in the codebase.

---

## TypeScript / NodeNext Compatibility

All local imports in backend packages (`NodeNext`/`NodeNext`) use `.js` extensions. [ASSUMED — project convention from CLAUDE.md, observed consistently in existing source files]

Patterns to follow for new files:

```typescript
// packages/telemetry/src/index.ts — local import
export * from './naming.js';   // .js extension required

// packages/db/src/repositories/events.ts — no new local imports needed
// existing import from 'drizzle-orm' is external, no extension needed

// scripts/db-validate.ts — workspace package imports
import { createDb, replayRun } from '@arena/db';        // workspace alias, no .js
import { SimEventPayloadSchemas } from '@arena/core';   // workspace alias, no .js
```

The `scripts/db-validate.ts` file is run with `tsx` directly (not compiled), so `tsconfig.base.json` `paths` aliases resolve correctly. The script does not need a `tsconfig.json` — `tsx` respects the root `tsconfig.json`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Windowed event counting | Custom timestamp arithmetic | Drizzle `and + gte` with ISO string comparison |
| Log redaction | Custom scrub logic | Pino `redact.paths` config |
| JSON to typed object | Manual field validation | Zod `.parse()` / `.safeParse()` |
| OTel span name construction | Ad-hoc string concatenation | Named constants from `src/naming.ts` |
| Process exit on fatal error | Custom shutdown manager | Direct `process.exit(1)` in the `main()` entry point guard |

---

## Common Pitfalls

### Pitfall 1: Wrong `events.source` Column for agentId Filter

**What goes wrong:** The `events.source` column stores agentId for broker/decision events, but stores the feed `sourceId` (e.g., `'demo-feed'`) for market tick events. If a query forgets to filter by `type`, it may count feed events as order events.

**Why it happens:** The `appendEventPayload` function accepts `source` as a free string. Convention is `agentId` for agent-sourced events, but this is not enforced by the schema.

**How to avoid:** Always include `eq(events.type, 'PAPER_ORDER_CREATED')` in the order counter query — the type filter is mandatory, not optional.

### Pitfall 2: Broker Event Payload Shape Mismatch

**What goes wrong:** `PaperOrderPayloadSchema = PaperOrderSchema` matches the inner `PaperOrder` object, but the stored event payload is `{ type: 'PAPER_ORDER_CREATED', order: PaperOrder }` (the full `BrokerEventPayload`).

**Why it happens:** `appendBrokerEvent` persists the entire `BrokerEventPayload` discriminated union as the payload JSON. The payload schemas in `types.ts` alias the inner domain schemas.

**How to avoid:** Use `z.record(z.unknown())` for broker event types in `SimEventPayloadSchemas` in Phase 1. Do not use the domain schemas (PaperOrderSchema etc.) as the dispatch map entries.

### Pitfall 3: `.js` Extension Omission in Telemetry Package

**What goes wrong:** Adding `export * from './naming'` (without `.js`) causes a build error under `module: NodeNext`.

**Why it happens:** NodeNext requires explicit file extensions on relative imports.

**How to avoid:** Always write `export * from './naming.js'` in `packages/telemetry/src/index.ts`.

### Pitfall 4: Pino `messageKey` Behavior Change

**What goes wrong:** Setting `messageKey: 'message'` in the telemetry factory changes where the log message appears in the JSON output. Existing code that reads `logRecord.msg` directly (e.g., test utilities) will find the message under `logRecord.message` instead.

**Why it happens:** Pino's default `messageKey` is `'msg'`. The factory uses `'message'` per the pino-logs rule.

**How to avoid:** In Phase 1 the factory is built but not yet used by existing packages (D-01). No immediate impact. Note for Phase 2+ when packages are migrated.

### Pitfall 5: `gte` Not Imported from `drizzle-orm`

**What goes wrong:** TypeScript error when adding windowed queries if `gte` is not added to the `drizzle-orm` import in `events.ts`.

**Why it happens:** `events.ts` currently only imports `{ asc, desc, eq }`.

**How to avoid:** The import line must be updated to `import { asc, desc, eq, and, gte } from 'drizzle-orm'`. Both `and` and `gte` are confirmed present in drizzle-orm 0.40.1.

### Pitfall 6: `StrategyIdSchema` Not in Current `types.ts` Imports

**What goes wrong:** `StrategySwitchRequestedPayloadSchema` uses `StrategyIdSchema` but the current import in `types.ts` only imports from `common.js`: `{ EventIdSchema, RunIdSchema, TimestampSchema }`. `StrategyIdSchema` is defined in `common.ts` but is not currently imported in `types.ts`.

**How to avoid:** Add `StrategyIdSchema` and `AgentIdSchema` to the existing import from `'../schemas/common.js'` in `types.ts`. Both exist in `common.ts`. `AgentIdSchema` is currently imported via `RiskEventSchema` indirectly but should be added explicitly. Check the current import line: `import { EventIdSchema, RunIdSchema, TimestampSchema } from '../schemas/common.js'` — extend it to include `AgentIdSchema, StrategyIdSchema`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pino` | `packages/telemetry` factory | ✓ | 9.14.0 | — |
| `drizzle-orm` `and`/`gte` | windowed queries | ✓ | 0.40.1 | — |
| `zod` 4.x | `SimEventPayloadSchemas` | ✓ | 4.4.3 | — |
| `tsx` | `pnpm db:validate` script runner | ✓ | ^4.0.0 (in workspace devDeps) | — |
| `better-sqlite3` | `createDb` in validate script | ✓ | ^11.3.0 | — |

No missing dependencies. All tools are available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^1.6.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm --filter @arena/db test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `createLogger` returns a Pino logger with correct `name` and `redact` config | unit | `pnpm --filter @arena/telemetry test` | ❌ Wave 0 |
| FOUND-01 | `naming.ts` exports are stable string constants (not undefined) | unit | `pnpm --filter @arena/telemetry test` | ❌ Wave 0 |
| FOUND-02 | `countOrdersInWindow` returns 0 for empty DB, correct count for seeded events | unit | `pnpm --filter @arena/db test` | ❌ Wave 0 |
| FOUND-02 | `countStrategySwitchesInWindow` returns 0 outside window, correct count inside | unit | `pnpm --filter @arena/db test` | ❌ Wave 0 |
| FOUND-03 | `SimEventPayloadSchemas` has an entry for every `SimEventType` value | unit | `pnpm --filter @arena/core test` | ❌ Wave 0 |
| FOUND-04 | `CoinbaseFeedAdapter` satisfies `MarketFeedAdapter` interface (TypeScript compile) | typecheck | `pnpm --filter @arena/feeds typecheck` | ✓ (implicit) |
| FOUND-04 | `apps/worker` typechecks without cast | typecheck | `pnpm --filter @arena/worker typecheck` | ✓ (implicit) |

### Sampling Rate

- Per task commit: `pnpm --filter @arena/core typecheck && pnpm --filter @arena/db typecheck`
- Per wave merge: `pnpm typecheck && pnpm test`
- Phase gate: full `pnpm typecheck && pnpm test` green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/telemetry/src/__tests__/logger.test.ts` — covers FOUND-01 (createLogger, redact config, naming constants)
- [ ] `packages/db/src/__tests__/events.test.ts` — extend existing file with windowed query tests for FOUND-02
- [ ] `packages/core/src/__tests__/event-types.test.ts` — covers FOUND-03 (SimEventPayloadSchemas completeness)

---

## Security Domain

`security_enforcement: true` (confirmed in `.planning/config.json`). ASVS Level 1.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not touched in Phase 1 |
| V3 Session Management | No | Not touched |
| V4 Access Control | No | Not touched |
| V5 Input Validation | Yes | Zod `parse()` replaces `as T` casts — this IS the V5 fix |
| V6 Cryptography | No | Hash chain untouched |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unsafe `as T` cast on deserialized data | Tampering | Zod `parse()` — FOUND-03 directly addresses this |
| Secret leakage in log output | Information Disclosure | Pino `redact.paths` in telemetry factory — FOUND-01 |
| Type confusion via missing interface method | Tampering | Required `onError` on interface — FOUND-04 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `events.source` stores `agentId` for `PAPER_ORDER_CREATED` and `STRATEGY_SWITCH_REQUESTED` events | Counter Query Design | Queries return wrong counts; risk counters silently broken |
| A2 | ISO-8601 string `gte` comparison is lexicographically correct in SQLite | Counter Query Design | Windowed queries return wrong rows for edge cases near UTC midnight |
| A3 | `tsx` is available in workspace devDependencies for the validate script | Environment Availability | `pnpm db:validate` fails at runtime |

Notes on assumptions:
- A1 is HIGH confidence — traced through source code (appendBrokerEvent → appendEventPayload with `source: agentId`). Marked ASSUMED only because the rule was derived from tracing rather than a formal schema constraint.
- A2 is HIGH confidence — ISO-8601 UTC format (ending in `Z`) sorts correctly as text in SQLite. The stored timestamps use `new Date().toISOString()` which always produces UTC Z format.
- A3 is HIGH confidence — `tsx` is in root `package.json` devDependencies (observed in existing scripts).

---

## Open Questions

1. **`PnLSnapshotPayloadSchema` wrapper shape**
   - What we know: The stored payload for `PNL_SNAPSHOT_CREATED` is `{ type: 'PNL_SNAPSHOT_CREATED', snapshot: PnLSnapshot }` (the full `BrokerEventPayload` discriminated union)
   - What's unclear: Whether Phase 1 should add strict wrapper schemas for broker events (more work) or use permissive fallbacks (simpler, deferred)
   - Recommendation: Use `z.record(z.unknown())` for all broker event types in Phase 1. The `as T` cast is still removed (which satisfies FOUND-03). Strict schemas are follow-up work.

2. **`db:validate` multi-run support**
   - What we know: `replayRun` takes a single `runId`
   - What's unclear: Whether the validate script should iterate all runs or just one
   - Recommendation: Accept optional `runId` arg (default `demo-local-paper-arena`). Adding multi-run support (query distinct `runId` values) can be a follow-up.

---

## Sources

### Primary (HIGH confidence)
- Source code read directly: `packages/core/src/events/types.ts`, `packages/core/src/interfaces.ts`, `packages/core/src/schemas/risk.ts`, `packages/db/src/repositories/events.ts`, `apps/api/src/index.ts`, `packages/feeds/src/clients/coinbase.ts`, `packages/feeds/src/clients/binance.ts`, `apps/worker/src/index.ts`, `packages/telemetry/src/index.ts`
- `.claude/rules/pino-logs.md` — complete `redact.paths` list and logger construction rules
- `.claude/rules/opentelemetry-naming.md` — naming constants spec
- `.planning/phases/01-foundation/01-CONTEXT.md` — locked decisions D-01 through D-11

### Secondary (MEDIUM confidence)
- `node_modules/drizzle-orm` version check confirming `and`, `gte`, `eq` availability in 0.40.1
- `node_modules/pino` version check confirming 9.14.0
- `node_modules/zod` version check confirming 4.4.3

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all packages verified in node_modules; no new dependencies
- Architecture: HIGH — traced through actual source code paths
- Pitfalls: HIGH — identified by direct source inspection (broker wrapper shape, missing imports)
- Counter queries: HIGH — Drizzle operators confirmed; source column traced
- OTel naming: HIGH — rule file read directly

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable stack; Zod v4 and Drizzle 0.40 are unlikely to change in 30 days)
