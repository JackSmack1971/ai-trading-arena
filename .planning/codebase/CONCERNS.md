# Codebase Concerns

**Analysis Date:** 2026-06-01

## Critical Gaps

### OpenRouter / LLM Agent Integration Not Wired

`packages/agents/src/index.ts` exports only a `DeterministicPaperAgent` that returns hardcoded BUY/SELL/NOOP decisions. No OpenRouter client, no `openai` SDK call, no prompt construction, and no model selection logic exists anywhere in the repo. The blueprint requires per-agent model selection, structured output parsing, and multi-turn reasoning. This is the largest missing feature.

- Files: `packages/agents/src/index.ts`
- Impact: The "AI" in AI Trading Arena is absent. Every agent decision is deterministic, not model-driven.
- Fix: Implement an `OpenRouterAgent` factory in `packages/agents/` using the OpenAI SDK pointed at `https://openrouter.ai/api/v1`, with Zod-parsed structured output and Bottleneck/p-retry wrapping.

### `packages/telemetry` and `packages/ui` Are Empty Shells

Both packages export only `export {};` — no Pino logger factory, no OpenTelemetry setup, no shared UI components.

- Files: `packages/telemetry/src/index.ts`, `packages/ui/src/index.ts`
- Impact: Every package re-creates its own Pino logger inline (e.g., `pino({ name: 'api' })` in `apps/api/src/index.ts`). No shared child-logger conventions, no redaction config, no OTel naming constants are applied consistently.
- Fix: Implement `packages/telemetry` with the shared Pino root logger, OTel naming constants (per `opentelemetry-naming.md`), and export from a barrel.

### API Uses Raw `node:http` Instead of Fastify

`apps/api/src/index.ts` builds the HTTP server with `node:http` `createServer` and a hand-rolled router. No Fastify plugin system, no JSON Schema validation, no `preValidation` hooks, no route generics, no typed schemas.

- Files: `apps/api/src/index.ts`
- Impact: All rules in `api-fastify-websocket.md`, `fastify-api-standards.md`, and `fastify-realtime-api.md` are violated. Input validation and error shaping are absent. `fastify.inject` tests cannot be written.
- Fix: Migrate `apps/api` to Fastify with versioned `/v1/` routes, Zod-to-JSON-Schema validation, `preValidation` auth gates, and typed route generics.

### WebSocket Telemetry Has No Inbound Message Validation

The WebSocket handler in `apps/api/src/index.ts` (lines 116–128) never parses or validates inbound WebSocket messages. The `message` event listener is not registered at all — only `close` and `error` are wired. This violates the `websocket-realtime-standards.md` requirement to validate every inbound message through a Zod discriminated union.

- Files: `apps/api/src/index.ts`
- Impact: Any client can send arbitrary payloads without rejection.

### Projection Layer Is a Stub

`packages/db/src/projections/index.ts` contains only `projectRunSummary` and `projectEventTypeCounts`. Read models for positions, P&L, order history, agent telemetry, risk events, and strategy signals are absent.

- Files: `packages/db/src/projections/index.ts`
- Impact: The API and dashboard reconstruct state by re-scanning every row on each request (see `buildTelemetry` in `apps/api/src/index.ts`), which does not scale beyond demo-sized event logs.
- Fix: Implement materialized projections per phase per blueprint section 3.

### No Playwright E2E Tests

No `playwright.config.ts`, no `e2e/` directory, and no Playwright dependency exists anywhere in the monorepo. The rules in `testing-vitest-playwright.md` require browser-visible flow coverage for dashboard rendering, WebSocket-driven updates, and chart interactions.

- Impact: Zero confidence in the UI layer from an automated test perspective.

### `ordersThisMinute` and `strategySwitchesThisHour` Always Zero in Demo

In `apps/api/src/index.ts`, `buildRiskState` hardcodes `ordersThisMinute: 0` and `strategySwitchesThisHour: 0`. The risk gate receives these values and cannot enforce order-frequency or strategy-switch limits during demo runs.

- Files: `apps/api/src/index.ts` (function `buildRiskState`)
- Impact: Two of the eight risk rules (`MAX_ORDERS_PER_MINUTE`, `MAX_STRATEGY_SWITCHES_PER_HOUR`) are permanently bypassed in the demo loop.
- Fix: Derive these counters from the event log by filtering `PAPER_ORDER_CREATED` and `STRATEGY_SWITCHED` events within the relevant time windows before constructing `RiskGateContext`.

---

## Technical Debt

### JSON.parse Without Zod at Event Deserialization

`apps/api/src/index.ts` deserializes SQLite event payloads with inline type assertions (`JSON.parse(row.payloadJson) as { symbol?: string; ... }`). No Zod schema validates these payloads at the read boundary.

- Lines: 200, 205, 214, 231
- Risk: Schema drift between stored events and deserialization assumptions goes undetected.
- Fix: Define per-event-type Zod response schemas in `packages/core` or `packages/db` and run `safeParse` on each row payload before projection.

### `onError` Cast in Worker

`apps/worker/src/index.ts` line 51 casts `adapter as unknown as { onError?: ... }` because `onError` is not declared in the `MarketFeedAdapter` interface in `packages/core/src/interfaces.ts`.

- Files: `apps/worker/src/index.ts:51`, `packages/core/src/interfaces.ts`
- Fix: Add `onError(handler: (err: Error) => void): void` to the `MarketFeedAdapter` interface.

### CORS Wildcard in Production-Targeted Code

`apps/api/src/index.ts` sets `access-control-allow-origin: *` unconditionally in `setCorsHeaders`. Acceptable for a local simulator but should be scoped to configured origins if the API is exposed beyond localhost.

- Files: `apps/api/src/index.ts` (function `setCorsHeaders`)

### Demo Tick Data Is Static and Minimal

`createDemoTicks()` in `apps/api/src/index.ts` returns exactly three hardcoded price points for BTC-USD. This limits the usefulness of replay, P&L charts, and strategy signal validation in demo mode.

- Files: `apps/api/src/index.ts` (function `createDemoTicks`)

### `appendEventPayload` Performs a SELECT on Every INSERT

`packages/db/src/repositories/events.ts` resolves the next sequence number by querying the last event before each insert. Under high-frequency appends this creates a per-insert round-trip. Safe for the current single-process synchronous better-sqlite3 setup, but will become a bottleneck if event volume grows.

- Files: `packages/db/src/repositories/events.ts`

### Web Frontend Has No Framework

`apps/web/src/index.ts` is a single-file vanilla JS DOM manipulation script. No React, no Vite plugins, no Tailwind, no Lightweight Charts, no Recharts — all of which are specified in `react-vite-tailwind.md` and `data-visualization-charts.md`.

- Files: `apps/web/src/index.ts`
- Impact: Chart data rendered as raw `<span>` height bars. No accessible semantics, no dark-mode tokens, no responsive layout per design system.

### Double Casts to Satisfy `appendEventPayload` Signature

`apps/api/src/index.ts` lines 329, 340, and 463 use `event as unknown as Record<string, unknown>` double casts to force broker event types into the persistence signature. This conceals schema mismatches between broker event payloads and stored shapes.

- Files: `apps/api/src/index.ts`
- Fix: Define adapter functions that destructure broker event payloads into typed `Record<string, unknown>` shapes.

---

## Test Coverage Gaps

### No Tests for API HTTP Routes

`apps/api` has `"test": "vitest run --passWithNoTests"`. Zero tests exist for the HTTP routes (`/health`, `/api/demo/run`, `/api/runs/:runId/*`) or the WebSocket telemetry handler.

- Files: `apps/api/` (no test files)
- Rules violated: `fastify-testing-standards.md`, `testing-vitest-playwright.md`
- Priority: High — these are the primary integration points.

### Risk Counter Rules Have No Integration Coverage

`packages/broker-paper/src/__tests__/` covers order fills, fees, P&L, and slippage. It does not cover scenarios where `ordersThisMinute` or `strategySwitchesThisHour` exceed limits, because the demo always passes zero for both counters. Risk rules `MAX_ORDERS_PER_MINUTE` and `MAX_STRATEGY_SWITCHES_PER_HOUR` have no end-to-end test coverage.

- Files: `packages/broker-paper/src/__tests__/broker.test.ts`
- Priority: High.

### No Tests for Projection Functions

`packages/db/src/projections/index.ts` has no companion test file. `projectRunSummary` and `projectEventTypeCounts` are not covered.

- Files: `packages/db/src/projections/index.ts`
- Priority: Medium.

### No Tests for WebSocket Connection Lifecycle

No test covers WebSocket connection, heartbeat, backpressure drop, or close cleanup in the API server.

- Priority: High once Fastify migration occurs.

### No Playwright Configuration or E2E Directory

`playwright.config.ts` and `e2e/` do not exist. Dashboard rendering, WebSocket-driven updates, and chart interactions have no automated coverage.

- Priority: Medium — blocked on React/Vite migration of `apps/web`.

---

## Security Observations

### Event Payload Stored Without Schema Enforcement

`appendEventPayload` in `packages/db/src/repositories/events.ts` accepts `payload: Record<string, unknown>` and stores `JSON.stringify(payload)` without Zod validation. Any caller can persist arbitrary data structures in the append-only event log.

- Files: `packages/db/src/repositories/events.ts`
- Risk: Malformed or oversized payloads in the event log cannot be repaired after persistence.

### No Input Validation on HTTP Request Bodies

The hand-rolled HTTP handler in `apps/api/src/index.ts` reads URL params and query strings but never validates or sanitizes HTTP request bodies. `POST /api/demo/run` ignores any body entirely. When additional endpoints are added, this pattern risks accepting unvalidated input.

- Files: `apps/api/src/index.ts` (function `handleHttp`)

### `runId` from URL Passed Directly to DB Query Without Length Check

`decodeURIComponent(url.pathname.split('/')[3])` feeds directly into `replayRun(db, runId)`. SQL injection is mitigated by Drizzle's parameterized `eq()`, but there is no length or character-set validation on `runId`.

- Files: `apps/api/src/index.ts`

---

## Type Safety Issues

### JSON.parse Payload Casts Are Unchecked

`apps/api/src/index.ts` lines 200, 205, 214, and 231 use `JSON.parse(...) as T` assertions that bypass TypeScript. Runtime shape mismatches between stored events and deserializer expectations produce silent failures.

- Fix: Replace with `safeParse` against per-event-type Zod schemas.

### `MarketFeedAdapter` Interface Missing `onError`

`packages/core/src/interfaces.ts` declares `onEvent` but not `onError` on `MarketFeedAdapter`. This forces the unsafe double cast in `apps/worker/src/index.ts:51`. Both Binance and Coinbase adapters implement `onError` but the interface does not expose it.

- Files: `packages/core/src/interfaces.ts`, `apps/worker/src/index.ts:51`

### `MockWebSocket.lastInstance` Typed as `any` in Test Fixture

`packages/feeds/src/__tests__/binance.test.ts` uses `static lastInstance: any = null` in the mock WebSocket class, which bypasses strict type checking in test assertions against the mock.

- Files: `packages/feeds/src/__tests__/binance.test.ts`

---

## Open Items from Docs

### Blueprint Unimplemented Features (from `docs/AI_TRADING_ARENA_BLUEPRINT.md`)

- **Real-time agent decision loop driven by live feed**: Worker connects to Coinbase and persists ticks, but live ticks do not trigger agent decisions or risk gate evaluation. Agent decisions only run in the deterministic demo path inside `apps/api`.
- **Agent-vs-agent competition**: Demo has two agents running sequentially against static tick data, not concurrently against a live feed.
- **Strategy hot-loading**: Registry and executor exist in `packages/strategies`, but no hot-reload mechanism is wired into the API or worker.
- **UI onboarding for OpenRouter API key**: No key-entry UI, no key validation flow.
- **Dashboard visualizations with Lightweight Charts / Recharts**: Not implemented; chart area uses raw `<span>` bars.
- **Exportable research logs**: No export endpoint or file-download path.
- **Historical replay UI**: `apps/worker/src/replay.ts` generates a CLI report; no HTTP or WebSocket endpoint surfaces replay state to the dashboard.
- **Polymarket, Kraken, DexScreener adapters**: Only Coinbase and Binance adapters exist in `packages/feeds`.

### AGENTS.md Guardrails Partially Unverifiable

AGENTS.md states "run the narrowest relevant `pnpm` typecheck and test commands after the repo grows into executable packages." `@arena/telemetry` and `@arena/ui` have no executable source, so their `typecheck` scripts pass vacuously and provide no signal.

---

## Recommended Next Steps

1. **Add `onError` to `MarketFeedAdapter` interface** (`packages/core/src/interfaces.ts`) — removes the unsafe cast in the worker, one-line fix, high correctness value.

2. **Implement `packages/telemetry` shared logger** — Pino root logger with redaction paths, child-logger helpers, and OTel trace-id injection. Required before any observability rule compliance can be verified across packages.

3. **Fix `ordersThisMinute` / `strategySwitchesThisHour` counter derivation** in `buildRiskState` (`apps/api/src/index.ts`) — compute from event log to activate the two currently-bypassed risk rules.

4. **Add Zod validation to event payload deserialization** — replace `JSON.parse(...) as T` casts in `apps/api/src/index.ts` with per-event-type `safeParse` against schemas from `packages/core`.

5. **Implement OpenRouter agent client** in `packages/agents` — OpenAI SDK pointed at `https://openrouter.ai/api/v1`, Zod structured output, Bottleneck/p-retry wrapping. Largest single feature gap.

6. **Migrate `apps/api` to Fastify** — replace `node:http` with Fastify plugins, versioned `/v1/` routes, JSON Schema validation from Zod, and `fastify.inject`-based route tests.

7. **Add API route tests** using `fastify.inject` (after Fastify migration) to cover HTTP routes and WebSocket lifecycle with Zod-shaped response assertions.

8. **Add Playwright configuration and one E2E smoke test** — dashboard load, WebSocket connection status indicator, and demo run button flow.

9. **Implement materialized projections** in `packages/db/src/projections/` — replace full-log scan in `buildTelemetry` with incremental read models for positions, P&L, and agent state.

10. **Migrate web frontend to React + Vite + Tailwind** per `react-vite-tailwind.md`, replacing the vanilla DOM script in `apps/web/src/index.ts` with typed components, Lightweight Charts series, and Recharts dashboard panels.

---

*Concerns audit: 2026-06-01*
