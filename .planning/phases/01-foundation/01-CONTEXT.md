# Phase 1: Foundation - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers 4 targeted infrastructure fixes that unblock every subsequent phase — a proper telemetry package (`packages/telemetry`), correct risk gate counters derived from the event log, safe event payload deserialization via per-type Zod `safeParse`, and a complete `MarketFeedAdapter` interface with required `onError`. No new user-facing features. This phase is about correctness before new capabilities are layered on top.

The 4 requirements (FOUND-01 through FOUND-04 in REQUIREMENTS.md) map directly to 4 implementation tasks.

</domain>

<decisions>
## Implementation Decisions

### Telemetry Package (FOUND-01 / TEL-01)

- **D-01:** Build the `@arena/telemetry` factory only in Phase 1. Do NOT update existing package loggers (`packages/feeds/src/logger.ts`, `packages/strategies/src/logger.ts`, `apps/api`, `apps/worker`) to import from `@arena/telemetry` yet. Existing loggers stay as-is. Packages adopt `@arena/telemetry` in Phase 2+ when they are already being modified for Fastify migration.
- **D-02:** OTel scope is **naming constants only** — export string constants (span names, metric names, attribute key names) from `src/naming.ts`. No `NodeSDK` initialization, no exporter configuration, no OTLP endpoint wiring. SDK bootstrap is deferred to Phase 2+ when there is actual instrumentation to emit.
- **D-03:** Pino `redact.paths` must implement the **complete list from `.claude/rules/pino-logs.md`** — covering `OPENROUTER_API_KEY`, prompt content fields, authorization headers, API key headers, and response content. Implement the full set now so all future package consumers inherit complete redaction without revisiting the factory.

### Zod Event Payload Parsing (FOUND-03 / API-04)

- **D-04:** When a per-type `safeParse` fails on a stored event row during replay — **throw and halt**. A parse failure means a stored event is corrupt or schema-incompatible; surface it immediately rather than silently degrading telemetry output. No skip-and-continue, no audit-event fallback.
- **D-05:** Phase 1 must include a **`pnpm db:validate` smoke-test script** that reads all event rows from `arena.db` and runs each through the new per-type payload schemas, reporting failures with row sequence numbers and issue paths. Run this before the live app is started after Phase 1 deploys.
- **D-06:** Per-event-type **payload parse schemas live in `packages/core`** alongside the existing `SimEventType` definitions (`packages/core/src/events/types.ts`). `packages/db` imports and calls them. Core remains the single schema source of truth — payload schemas are not duplicated in `packages/db`.

### Risk Gate Counters (FOUND-02 / API-03)

- **D-07:** Counter derivation stays in the **caller layer** (currently `apps/api`). The caller queries `@arena/db` for recent events and assembles the complete `RiskGateContext` before calling `PaperRiskGate.evaluateOrder()`. `packages/broker-paper` must not gain a dependency on `@arena/db`. The existing context-as-value-object pattern is preserved.
- **D-08:** `ordersThisMinute` counts **`PAPER_ORDER_CREATED`** events with `timestamp >= now - 60s` for the same `runId` and `agentId`. This measures order-placement rate (the intent of the rule), not fill rate. Unfilled limit orders still count against the rate limit.
- **D-09:** `strategySwitchesThisHour` requires a **new `STRATEGY_SWITCH_REQUESTED` event type** added to `packages/core/src/events/types.ts` (with a corresponding payload schema). The counter queries this event type with `timestamp >= now - 3600s`. Do NOT use `STRATEGY_SIGNAL_CREATED` as a proxy — signals are not switches and would inflate counts incorrectly.

### MarketFeedAdapter Interface (FOUND-04 / AGENT-02)

- **D-10:** `onError` is a **required field** on `MarketFeedAdapter` (not optional). Both `CoinbaseFeedAdapter` (`packages/feeds/src/clients/coinbase.ts`) and `BinanceFeedAdapter` (`packages/feeds/src/clients/binance.ts`) must implement it in Phase 1. This is an intentional breaking change — the unsafe cast in `apps/worker` is removed and error propagation becomes explicit.
- **D-11:** When `onError` fires, wire it to the **existing terminal pattern**: `pino.fatal` log + stop all adapters + `process.exit(1)`. No behavior change from the current error handling — the goal is removing the unsafe cast, not redesigning error recovery. Feed reconnect/retry belongs in a separate feed-adapter-hardening phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and Rules
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-04 specifications with exact acceptance criteria; traceability table mapping each to Phase 1
- `.claude/rules/pino-logs.md` — complete `redact.paths` list and Pino logger construction rules (D-03 depends on this)
- `.claude/rules/opentelemetry-naming.md` — naming constants spec: span name patterns, metric name patterns, attribute key conventions

### Target Files for This Phase
- `packages/telemetry/src/index.ts` — empty stub to be fully implemented (D-01, D-02, D-03)
- `packages/core/src/interfaces.ts` — `MarketFeedAdapter` interface; add required `onError: (err: Error) => void` (D-10)
- `packages/core/src/events/types.ts` — `SimEventType` enum and payload interfaces; add `STRATEGY_SWITCH_REQUESTED` + payload schemas; add per-type payload parse schemas for all event types (D-06, D-09)
- `packages/broker-paper/src/risk-gate.ts` — `RiskGateContext` shape; `evaluateOrder()` uses `ordersThisMinute` and `strategySwitchesThisHour` from context (D-07, D-08, D-09)
- `packages/db/src/repositories/events.ts` — event log query functions; add helpers for counter queries (PAPER_ORDER_CREATED in window, STRATEGY_SWITCH_REQUESTED in window) (D-07)

### Feed Adapter Implementations (FOUND-04)
- `packages/feeds/src/clients/coinbase.ts` — must add `onError` implementation (D-10, D-11)
- `packages/feeds/src/clients/binance.ts` — must add `onError` implementation (D-10, D-11)
- `apps/worker/src/index.ts` — remove unsafe cast; wire `onError` to terminal pattern (D-10, D-11)

### Risk Gate Schema
- `packages/core/src/schemas/risk.ts` — `RiskGateContext` schema with `ordersThisMinute` and `strategySwitchesThisHour` fields; verify field types match new derived values

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/schemas/common.ts` — `DecimalStringSchema`, `TimestampSchema`, `RunIdSchema`, `AgentIdSchema` etc. available for composing new payload Zod schemas (D-06)
- `packages/core/src/events/types.ts` — existing `SimEventType` enum and typed payload interfaces; extend with `STRATEGY_SWITCH_REQUESTED` and add Zod schema variants alongside existing TypeScript types
- `packages/db/src/repositories/events.ts` — `appendEventPayload`, `replayRun`, `verifyHashChain` already handle event persistence and replay; add windowed-query helpers for counter derivation alongside these functions

### Established Patterns
- **Pino logger construction:** One named root logger per package (`pino({ name: '<package>' })`); child loggers derived with `logger.child(...)`. The new `@arena/telemetry` factory must output a compatible root logger that callers can use with this same pattern.
- **Zod boundary usage:** `schema.parse()` for trusted startup paths (throw on failure intended); `schema.safeParse()` for replay, batch, and user-facing paths. D-04 (throw on replay parse failure) means payload parsing uses `parse()` not `safeParse()`.
- **RiskGateContext as value object:** Context is assembled by the caller and passed to the gate as a plain typed object. No callback, no DB ref inside the gate. D-07 explicitly preserves this decoupling.
- **SimEventType discriminated union:** All broker events flow as typed `BrokerEventPayload` discriminated unions. New `STRATEGY_SWITCH_REQUESTED` must follow the same pattern with a typed payload interface + Zod schema.

### Integration Points
- `packages/telemetry/src/index.ts` → becomes the Pino factory + OTel naming constants export. Other packages will import from `@arena/telemetry` starting Phase 2.
- `packages/core/src/events/types.ts` → gains both a new enum value (`STRATEGY_SWITCH_REQUESTED`) and per-type Zod payload schemas for all existing event types. Both `packages/db` and `apps/api` import from here.
- `apps/api/src/index.ts` → two fix sites: (1) replace hardcoded `ordersThisMinute: 0` / `strategySwitchesThisHour: 0` with event log queries; (2) replace `JSON.parse(row.payload) as T` with typed `parse()` calls.
- `packages/feeds/src/clients/` → Coinbase and Binance adapters each implement the now-required `onError` field.

</code_context>

<specifics>
## Specific Ideas

- `pnpm db:validate` — new root script that validates all events in `arena.db` against the new per-type payload schemas. Reports failures with row `seq`, `eventType`, and Zod issue paths. Should exit non-zero if any rows fail so CI can catch backward-compat breaks.
- `STRATEGY_SWITCH_REQUESTED` payload should carry at minimum: `runId`, `agentId`, `fromStrategyId`, `toStrategyId`, `timestamp`. Matches the `TimestampSchema` and ID schema conventions from `packages/core/src/schemas/common.ts`.
- The naming constants file in `packages/telemetry` should be `src/naming.ts` (matching the path referenced in `.claude/rules/opentelemetry-naming.md`: `packages/observability/src/naming.ts` is the rule's suggested location — use `packages/telemetry/src/naming.ts` since this project uses `@arena/telemetry` not a separate observability package).

</specifics>

<deferred>
## Deferred Ideas

- **Feed reconnect/retry on error** — Wire `onError` to Bottleneck + p-retry reconnect policy instead of `exit(1)`. Proper resilience, but belongs in the feed-adapter-hardening phase, not Phase 1.
- **NodeSDK OpenTelemetry initialization** — `createTelemetrySdk()` factory with OTLP exporter. Deferred to Phase 2+ when there is actual instrumentation to emit.
- **Existing package logger migration** — Update `packages/feeds/src/logger.ts`, `packages/strategies/src/logger.ts`, `apps/api`, `apps/worker` to import from `@arena/telemetry`. Deferred to Phase 2+ when those packages are already being modified for Fastify migration.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-02*
