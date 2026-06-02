# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 1-Foundation
**Areas discussed:** Telemetry adoption scope, Zod parse failure policy, Risk counter query ownership, onError optional vs required

---

## Telemetry Adoption Scope

### Q1: Factory only vs. wire all packages now?

| Option | Description | Selected |
|--------|-------------|----------|
| Just build the factory | Implement @arena/telemetry. Existing loggers stay as-is. Packages adopt in Phase 2+. | ✓ |
| Wire all packages now | Also update feeds/strategies/api/worker loggers to import from @arena/telemetry in Phase 1. | |

**User's choice:** Just build the factory
**Notes:** Existing package loggers untouched in Phase 1 — they'll be updated when those packages are already being modified for Fastify migration.

### Q2: OTel depth — naming constants only vs. NodeSDK bootstrap?

| Option | Description | Selected |
|--------|-------------|----------|
| Naming constants only | Export string constants from naming.ts. No NodeSDK init. | ✓ |
| Constants + NodeSDK bootstrap | Also add createTelemetrySdk() factory with OTLP/console exporter. | |

**User's choice:** Naming constants only
**Notes:** SDK wiring deferred to Phase 2+ when there is actual instrumentation to emit.

### Q3: Pino redact.paths — exact rule list vs. minimal subset?

| Option | Description | Selected |
|--------|-------------|----------|
| Exact rule list | All redact.paths from pino-logs.md implemented now. | ✓ |
| Minimal subset now | Just OPENROUTER_API_KEY + auth headers; prompt paths added in Phase 3. | |

**User's choice:** Exact rule list
**Notes:** Full config now so all future consumers inherit complete redaction without revisiting.

---

## Zod Parse Failure Policy

### Q1: What happens when safeParse fails on a stored event row during replay?

| Option | Description | Selected |
|--------|-------------|----------|
| Throw and halt replay | A parse failure is a data integrity problem — stop immediately. | ✓ |
| Skip + log warn, return typed unknown | Continue replay with a typed UnknownEvent sentinel. | |
| Emit audit event, continue | Persist PAYLOAD_VALIDATION_FAILED event, continue replay. | |

**User's choice:** Throw and halt replay
**Notes:** Forces backward-compat issues to surface and be fixed before shipping.

### Q2: Include a pnpm db:validate smoke-test script?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include smoke-test script | pnpm db:validate replays all arena.db events through new schemas before app runs. | ✓ |
| No — delete/reset arena.db instead | Demo db only has synthetic data; just delete and regenerate. | |

**User's choice:** Yes — include smoke-test script
**Notes:** Low cost, high confidence — validates backward compat before the new parse code goes live.

### Q3: Where do per-event-type payload parse schemas live?

| Option | Description | Selected |
|--------|-------------|----------|
| In packages/core | Alongside SimEventType definitions — single schema source of truth. | ✓ |
| In packages/db | Co-located with repository functions that read events. | |

**User's choice:** In packages/core
**Notes:** Consistent with the existing convention that all domain schemas live in @arena/core.

---

## Risk Counter Query Ownership

### Q1: Who assembles the correct counter values for RiskGateContext?

| Option | Description | Selected |
|--------|-------------|----------|
| Caller assembles context | API/worker queries @arena/db and passes counts in. Broker-paper stays DB-free. | ✓ |
| New helper in packages/db | buildRiskGateContext(db, runId, agentId) helper centralizes the query. | |
| New helper in packages/broker-paper | RiskGateContextBuilder adds DB dependency to broker-paper. | |

**User's choice:** Caller assembles context
**Notes:** Preserves the existing context-as-value-object decoupling. Broker-paper never touches the DB.

### Q2: Which event type does ordersThisMinute count?

| Option | Description | Selected |
|--------|-------------|----------|
| PAPER_ORDER_CREATED | Counts order placement attempts in last 60s — measures placement rate. | ✓ |
| PAPER_ORDER_FILLED | Counts completed fills only — more conservative but fill timing is unpredictable. | |

**User's choice:** PAPER_ORDER_CREATED
**Notes:** Matches the intent of max-orders-per-minute as a placement-rate limiter.

### Q3: How does strategySwitchesThisHour get a reliable event to count?

| Option | Description | Selected |
|--------|-------------|----------|
| Add STRATEGY_SWITCH_REQUESTED event | New SimEventType in packages/core. Count it in last 3600s. | ✓ |
| Use STRATEGY_SIGNAL_CREATED as proxy | Count distinct strategy IDs in signals per hour. | |

**User's choice:** Add STRATEGY_SWITCH_REQUESTED event
**Notes:** Signals are not switches — using them as a proxy would inflate counts for high-frequency strategies and make the rule semantically wrong.

---

## onError: Optional or Required

### Q1: Should onError be required or optional on MarketFeedAdapter?

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Breaking change — both adapters must implement it in Phase 1. Removes unsafe cast. | ✓ |
| Optional with no-op default | Non-breaking — existing adapters compile without changes. | |

**User's choice:** Required
**Notes:** Phase 1 is already touching packages/core. Clean break is acceptable; removes the unsafe cast in apps/worker.

### Q2: What does onError do when it fires?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current terminal pattern | Fatal log + stop all adapters + exit(1). No behavior change. | ✓ |
| Add retry via Bottleneck/p-retry | Reconnect-with-backoff instead of immediate exit. | |

**User's choice:** Keep current terminal pattern
**Notes:** Phase 1 removes the unsafe cast, not redesigns error recovery. Retry belongs in feed-adapter-hardening.

---

## Claude's Discretion

None — all gray areas had explicit user decisions.

## Deferred Ideas

- **Feed reconnect/retry on error** — Bottleneck + p-retry reconnect policy on `onError`. Belongs in feed-adapter-hardening phase.
- **NodeSDK OpenTelemetry initialization** — `createTelemetrySdk()` with OTLP exporter. Deferred to Phase 2+.
- **Existing package logger migration** — feeds/strategies/api/worker to `@arena/telemetry`. Deferred to Phase 2+ (Fastify migration phase).
