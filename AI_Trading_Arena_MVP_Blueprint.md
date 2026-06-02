# AI Trading Arena MVP Blueprint

## 1. Product Definition

**AI Trading Arena** is a local-first, event-sourced AI paper-trading simulator where LLM agents use OpenRouter to observe live market data, make paper-trading decisions, and display the full loop in a replayable React dashboard. It is a research and experimentation platform, not a live-trading system. No real funds, real orders, brokerage execution, custody, or wallet-signing belong in the MVP.

**Core value:** an AI agent you can watch make paper trades in real time, from market observation to LLM decision to risk gate to paper fill to chart update, with every state change replayable and auditable.

## 2. Non-Negotiable Invariants

The system must preserve these invariants across every phase:

| Invariant | Rule |
|---|---|
| No real execution | The simulator must never include real brokerage, wallet-signing, custody, exchange execution, or fund-moving adapters. |
| Paper-only risk gate | `PaperRiskGate` remains the final authority and must reject live execution modes. |
| Local-first SQLite | SQLite remains the local event store with single-process write ownership. |
| Event-sourced replayability | Every final state change must be represented by a persisted, hash-chained event. |
| Zod as source of truth | Runtime schemas live in `packages/core`; TypeScript types derive from `z.infer`. |
| Secret isolation | `OPENROUTER_API_KEY` must never be logged or exposed to the browser bundle. |
| Strict TypeScript | No unsafe `any` or unchecked boundary casts in domain-critical paths. |

## 3. Current Codebase Baseline

The repo is already a pnpm TypeScript monorepo with deployable apps under `apps/`, shared packages under `packages/`, user strategy packs under `strategies/`, and planning/agent workflow material under `.planning` and `.claude`.

### Existing apps

| App | Current role | MVP direction |
|---|---|---|
| `apps/api` | Raw Node HTTP + `ws` server, demo run endpoint, telemetry projection, WebSocket telemetry stream | Migrate to Fastify 5 with versioned `/v1` routes and `@fastify/websocket`. |
| `apps/web` | Stub dashboard | Replace with React + Vite + Tailwind dashboard. |
| `apps/worker` | Public feed ingestion worker with graceful shutdown and replay utilities | Keep feed worker but harden adapter error handling and telemetry flow. |

`apps/api` currently exposes health, demo run, event, telemetry, and summary endpoints, but it still uses raw Node HTTP rather than Fastify.

### Existing packages

| Package | Current role |
|---|---|
| `packages/core` | Domain schemas, event types, interfaces, money primitives, constants. |
| `packages/db` | SQLite append-only event store with hash-chain integrity. |
| `packages/broker-paper` | Paper broker, fills, fees, slippage, positions, P&L, risk gate. |
| `packages/feeds` | Coinbase and Binance public market feed adapters with Bottleneck rate limiting. |
| `packages/strategies` | Strategy manifest validation, loader, registry, built-ins. |
| `packages/agents` | Deterministic paper agent interface and demo agents. |
| `packages/telemetry` | Stub; must become shared logger and OTel naming package. |
| `packages/ui` | Stub; deferred until dashboard/component extraction. |

The package boundaries are already documented and mostly aligned with the MVP architecture.

## 4. Validated Existing Capabilities

The current codebase already has:

| Capability | Status |
|---|---|
| Append-only hash-chained event log | Existing |
| Paper broker with market/limit fills, fees, slippage, P&L | Existing |
| Deterministic risk gate | Existing |
| Decimal.js money arithmetic | Existing |
| Deterministic demo simulation loop | Existing |
| WebSocket telemetry stream | Existing |
| Coinbase + Binance public feed adapters | Existing |
| Strategy pack system with built-ins | Existing |
| Deterministic paper agents | Existing |
| Hash-chain verification | Existing |

## 5. Primary Gaps

The MVP is blocked by these gaps:

| Gap | Impact |
|---|---|
| No OpenRouter LLM agent | The “AI” loop is not complete. |
| Raw Node API instead of Fastify | Violates intended API architecture and makes typed route testing harder. |
| Empty `packages/telemetry` | No shared redacted logger or OTel naming constants. |
| Stub frontend | No usable React dashboard. |
| Hardcoded risk counters | Two risk rules are bypassed. |
| No Playwright E2E setup | Full dashboard loop is not test-covered. |
| Unsafe event payload casts | SQLite event replay can trust invalid payloads. |

## 6. MVP Requirements

### Foundation

| ID | Requirement |
|---|---|
| `FOUND-01` | Implement `packages/telemetry`: Pino root logger factory, redaction, child logger helpers, OTel naming constants. |
| `FOUND-02` | Derive `ordersThisMinute` and `strategySwitchesThisHour` from event-log queries instead of hardcoded zeroes. |
| `FOUND-03` | Parse event payloads through per-event-type Zod schemas; remove unsafe `JSON.parse(...) as T` patterns. |
| `FOUND-04` | Add required `onError` handler to `MarketFeedAdapter`; remove unsafe worker cast. |

### API

| ID | Requirement |
|---|---|
| `API-01` | Migrate `apps/api` to Fastify 5 with `buildApp()`, `/v1` routes, Zod JSON schema validation, decorators, and clean shutdown. |
| `API-02` | Register `@fastify/websocket`; expose `GET /v1/telemetry/stream`; close sockets cleanly; heartbeat every 30 seconds. |
| `API-03` | Add Fastify route tests for HTTP routes and WebSocket lifecycle. |

### Core Features

| ID | Requirement |
|---|---|
| `CORE-01` | Add typed materialized projection functions in `packages/db/src/projections/`; wire telemetry to use projections instead of full event-log scans. |
| `CORE-02` | Implement `createOpenRouterAgent()` with OpenAI SDK base URL override, Zod structured output, Bottleneck, `p-retry`, and safe fallback behavior. |

### Dashboard

| ID | Requirement |
|---|---|
| `DASH-01` | Scaffold React 19 + Vite + Tailwind v3.4 dashboard with four-zone shell and telemetry socket hook. |
| `DASH-02` | Add Lightweight Charts price chart panel. |
| `DASH-03` | Add Recharts equity curve panel and trade tape. |
| `DASH-04` | Add agent reasoning timeline panel. |
| `DASH-05` | Add run controls: start, stop, replay/strategy controls, connection status. |

### Tests

| ID | Requirement |
|---|---|
| `TEST-01` | Add Playwright config and E2E smoke tests for dashboard load, WebSocket status, demo run, and trade tape flow. |

## 7. Delivery Roadmap

The MVP should ship in five phases:

| Phase | Name | Goal | Dependency |
|---|---|---|---|
| Phase 1 | Foundation | Correctness, logging, schema safety, adapter error contract | None |
| Phase 2 | API Migration | Fastify 5, versioned routes, WebSocket plugin, route tests | Phase 1 |
| Phase 3 | Core Features | Materialized projections and OpenRouter LLM agent | Phases 1–2 |
| Phase 4 | React Dashboard | Four-panel dashboard wired to live telemetry | Phases 2–3 |
| Phase 5 | E2E Tests | Playwright smoke tests for the full dashboard flow | Phases 2–4 |

## 8. Phase 1 — Foundation

### Goal

Make the simulator correct and observable before layering new features on top. Phase 1 delivers four infrastructure fixes: telemetry package, real risk counters, Zod payload parsing, and required feed adapter error handling.

### Plans

| Plan | Wave | Scope | Depends on |
|---|---:|---|---|
| `01-01` | 1 | Core schema additions, `STRATEGY_SWITCH_REQUESTED`, `SimEventPayloadSchemas`, `MarketFeedAdapter.onError` | None |
| `01-02` | 2 | DB helpers: `countOrdersInWindow`, `countStrategySwitchesInWindow` | `01-01` |
| `01-03` | 3 | API + worker call-site fixes, risk counter wiring, unsafe cast removal | `01-01`, `01-02` |
| `01-04` | 2 | `packages/telemetry`: Pino logger factory and OTel naming constants | `01-01` |
| `01-05` | 4 | `db:validate` script and full phase gate | `01-01` through `01-04` |

### Phase 1 acceptance gate

```bash
pnpm typecheck
pnpm test
grep -rn "JSON\.parse.*as " apps/api/src/
grep "onError" packages/core/src/interfaces.ts
grep "db:validate" package.json
pnpm db:validate
```

Expected results:

| Check | Expected result |
|---|---|
| `pnpm typecheck` | Exit 0 |
| `pnpm test` | Exit 0 |
| unsafe cast grep | No output |
| `onError` grep | Required interface method exists |
| `db:validate` grep | Script exists in `package.json` |
| `pnpm db:validate` | Exit 0 for valid event rows, or actionable failure report |

## 9. Phase 2 — API Migration

### Goal

Replace the raw Node API server with Fastify 5 while preserving existing simulator behavior.

### Required output

| Artifact | Purpose |
|---|---|
| `apps/api/src/app.ts` | `buildApp()` factory for tests and runtime. |
| `apps/api/src/index.ts` | Thin server bootstrap. |
| `apps/api/src/plugins/db.ts` | Registers SQLite DB decorator. |
| `apps/api/src/plugins/logger.ts` | Registers logger decorator. |
| `apps/api/src/plugins/websocket.ts` | Registers `@fastify/websocket`. |
| `apps/api/src/routes/health.ts` | `GET /v1/health`. |
| `apps/api/src/routes/demo.ts` | `POST /v1/demo/run`, `DELETE /v1/demo/run`. |
| `apps/api/src/routes/runs.ts` | Run events, summary, telemetry endpoints. |
| `apps/api/src/routes/telemetry-stream.ts` | WebSocket telemetry stream. |
| `apps/api/src/__tests__/` | `fastify.inject` and WebSocket lifecycle tests. |

### Implementation plan

| Plan | Scope | Acceptance |
|---|---|---|
| `02-01` | Add Fastify dependencies and `buildApp()` shell | App boots, health route passes. |
| `02-02` | Migrate existing HTTP routes to `/v1` | Existing demo run behavior preserved. |
| `02-03` | Add Zod request/response schemas and type provider | Route responses validate. |
| `02-04` | Migrate telemetry WebSocket to Fastify plugin | WebSocket connects and receives telemetry. |
| `02-05` | Add route and WebSocket tests | `pnpm --filter @arena/api test` passes. |

### Phase 2 acceptance gate

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
pnpm typecheck
pnpm test
```

Required truths:

| Truth |
|---|
| `POST /v1/demo/run` returns a validated response envelope. |
| `GET /v1/telemetry/stream` accepts WebSocket upgrades. |
| Fastify shuts down cleanly. |
| Existing hash-chain verification still passes after a demo run. |
| Raw `http.createServer` no longer owns the API routing layer. |

## 10. Phase 3 — Core Features

### Goal

Replace expensive replay-time telemetry scans with projections and add the real OpenRouter-backed LLM agent.

### Stream A: Materialized projections

| Artifact | Purpose |
|---|---|
| `packages/db/src/projections/positions.ts` | Project positions from event rows. |
| `packages/db/src/projections/pnl.ts` | Project P&L/equity snapshots. |
| `packages/db/src/projections/orders.ts` | Project order history/trade tape. |
| `packages/db/src/projections/agents.ts` | Project agent telemetry and reasoning events. |
| `packages/db/src/projections/index.ts` | Barrel export. |
| `packages/db/src/projections/__tests__/` | Projection tests. |

Acceptance:

| Truth |
|---|
| `buildTelemetry` imports projection functions. |
| `buildTelemetry` no longer performs full ad hoc log scans for every view model. |
| Projection functions are pure: `EventRow[] -> typed view model`. |
| Empty logs, single-event logs, and multi-event logs are tested. |
| Dashboard-facing telemetry payloads are stable and typed. |

### Stream B: OpenRouter LLM agent

| Artifact | Purpose |
|---|---|
| `packages/agents/src/openrouter-agent.ts` | `createOpenRouterAgent()` implementation. |
| `packages/agents/src/openrouter-client.ts` | OpenAI SDK configured with OpenRouter `baseURL`. |
| `packages/agents/src/decision-schema.ts` | Structured-output helpers using `z.toJSONSchema()`. |
| `packages/agents/src/rate-limit.ts` | Bottleneck limiter. |
| `packages/agents/src/retry.ts` | `p-retry` wrapper. |
| `packages/agents/src/__tests__/openrouter-agent.test.ts` | Mocked OpenRouter fixture tests. |

Acceptance:

| Truth |
|---|
| Agent uses OpenAI SDK pointed at `https://openrouter.ai/api/v1`. |
| Agent returns valid `AgentDecision` objects. |
| Invalid model output falls back to deterministic `NOOP`. |
| API key never appears in logs or browser code. |
| 429 behavior does not consume retry budget incorrectly. |
| Mocked round-trip fixture proves Zod JSON schema serialization and parse behavior. |

## 11. Phase 4 — React Dashboard

### Goal

Build the watchable simulator experience: a four-panel dashboard that shows live prices, agent decisions, portfolio performance, and run controls.

### Required dashboard layout

| Zone | Component | Purpose |
|---|---|---|
| Top/left | `PriceChartPanel` | Live BTC-USD price chart using Lightweight Charts. |
| Top/right | `AgentReasoningPanel` | LLM decisions, action, thesis, evidence, confidence, model, latency. |
| Bottom/left | `EquityCurvePanel` | Agent equity curve and P&L using Recharts. |
| Bottom/right | `RunControlsPanel` + trade tape | Start/stop/replay controls, connection state, fills log. |

### Required frontend artifacts

| Artifact | Purpose |
|---|---|
| `apps/web/src/main.tsx` | React entry. |
| `apps/web/src/App.tsx` | Dashboard shell. |
| `apps/web/src/components/PriceChartPanel.tsx` | Lightweight Charts panel. |
| `apps/web/src/components/EquityCurvePanel.tsx` | Recharts equity/P&L panel. |
| `apps/web/src/components/AgentReasoningPanel.tsx` | Reasoning timeline. |
| `apps/web/src/components/RunControlsPanel.tsx` | Start/stop/status controls. |
| `apps/web/src/hooks/useTelemetrySocket.ts` | WebSocket state and telemetry updates. |
| `apps/web/src/api/client.ts` | HTTP client for `/v1` API. |
| `apps/web/src/types/telemetry.ts` | Dashboard-facing telemetry types. |
| `apps/web/tailwind.config.ts` | Tailwind v3.4 config. |
| `apps/web/vite.config.ts` | Vite proxy for Fastify HTTP and WebSocket. |

### Implementation plan

| Plan | Scope | Acceptance |
|---|---|---|
| `04-01` | React + Vite + Tailwind scaffold | App loads at `localhost:5173`. |
| `04-02` | Layout shell and theme | Four dashboard zones visible. |
| `04-03` | `useTelemetrySocket` | Connection states: connecting, open, degraded, reconnecting, failed. |
| `04-04` | Price chart panel | `[data-testid="price-chart"]` visible and receives ticks. |
| `04-05` | Equity curve + trade tape | Equity data and fills render after demo run. |
| `04-06` | Agent reasoning panel | Last LLM decision renders action, thesis, model, confidence. |
| `04-07` | Run controls | Start button triggers `POST /v1/demo/run`; stop button calls stop endpoint. |

### Phase 4 acceptance gate

```bash
pnpm --filter @arena/web typecheck
pnpm --filter @arena/web test
pnpm typecheck
pnpm test
pnpm dev:web
```

Required truths:

| Truth |
|---|
| Dashboard loads with no console errors. |
| All four panels render. |
| Price chart canvas is visible. |
| Equity curve receives at least one point after demo run. |
| Agent reasoning panel shows decision data. |
| Run controls can start a demo run. |
| WebSocket connection state is visible. |

## 12. Phase 5 — E2E Tests

### Goal

Add Playwright smoke tests that verify the full dashboard loop.

### Required artifacts

| Artifact | Purpose |
|---|---|
| `playwright.config.ts` | Dual webServer config: Fastify on 3000, Vite on 5173. |
| `e2e/dashboard.spec.ts` | Dashboard load and panel visibility. |
| `e2e/run-controls.spec.ts` | Start demo run and assert trade tape update. |
| `e2e/websocket.spec.ts` | Mock telemetry stream and assert status indicator. |
| `e2e/fixtures/telemetry.ts` | Deterministic telemetry fixtures. |

### Required tests

| Test | Assertion |
|---|---|
| Dashboard smoke | Four panels are visible on load. |
| WebSocket status | Status indicator reaches `open`. |
| Demo run flow | Start button produces a trade tape entry. |
| Price chart flow | Price chart receives and renders telemetry. |
| Agent reasoning flow | Mocked decision appears in reasoning panel. |

### Phase 5 acceptance gate

```bash
pnpm typecheck
pnpm test
pnpm exec playwright test
```

Required truths:

| Truth |
|---|
| Playwright starts API and web servers automatically. |
| Dashboard load smoke test passes. |
| WebSocket status test passes. |
| Demo run button flow passes. |
| Trade tape receives at least one entry. |
| No browser console errors fail the suite. |

## 13. Traceability Matrix

| Requirement | Phase | Primary artifacts | Verification |
|---|---|---|---|
| `FOUND-01` | 1 | `packages/telemetry/src/index.ts`, `naming.ts` | telemetry typecheck/tests |
| `FOUND-02` | 1 | `packages/db/src/repositories/events.ts`, `apps/api/src/index.ts` | DB tests, API typecheck |
| `FOUND-03` | 1 | `packages/core/src/events/types.ts`, API parse sites, `scripts/db-validate.ts` | grep, db validate, tests |
| `FOUND-04` | 1 | `packages/core/src/interfaces.ts`, `apps/worker/src/index.ts` | worker/core typecheck |
| `API-01` | 2 | Fastify app factory and routes | Fastify route tests |
| `API-02` | 2 | Fastify WebSocket route | WebSocket lifecycle tests |
| `API-03` | 2 | `apps/api/src/__tests__` | `fastify.inject`, ws fixtures |
| `CORE-01` | 3 | `packages/db/src/projections` | projection tests |
| `CORE-02` | 3 | `packages/agents/src/openrouter-agent.ts` | mocked OpenRouter tests |
| `DASH-01` | 4 | React/Vite/Tailwind scaffold | web typecheck, smoke render |
| `DASH-02` | 4 | `PriceChartPanel` | chart test / Playwright |
| `DASH-03` | 4 | `EquityCurvePanel`, trade tape | chart data test |
| `DASH-04` | 4 | `AgentReasoningPanel` | decision fixture render |
| `DASH-05` | 4 | `RunControlsPanel` | API interaction test |
| `TEST-01` | 5 | `playwright.config.ts`, `e2e/` | Playwright suite |

## 14. Risk Register

| Risk | Phase | Mitigation |
|---|---|---|
| Stored event payloads fail new Zod schemas | 1 | Add `pnpm db:validate`; use permissive schemas for legacy broker wrapper events where needed. |
| Risk counters remain bypassed | 1 | Query event log by `runId`, `agentId`, event type, and time window. |
| Fastify migration breaks demo flow | 2 | Preserve demo behavior behind route tests and hash-chain verification. |
| WebSocket lifecycle leaks sockets | 2 | Track active sockets; close on `preClose`; heartbeat ping/pong. |
| Projection logic diverges from event source | 3 | Projection tests against deterministic event fixtures. |
| OpenRouter structured output mismatch | 3 | Mocked round-trip fixture using `z.toJSONSchema()` and Zod parse. |
| API key leaks to logs or browser | 3–4 | Redacted logger, env-only server usage, no key in frontend. |
| Dashboard performance degrades with long runs | 4 | Cap chart data points, use materialized projections. |
| E2E flakiness | 5 | Deterministic fixtures and mocked WebSocket tests where appropriate. |

## 15. Status Normalization

The current planning docs should normalize progress language before execution continues.

Recommended statuses:

| Status | Meaning |
|---|---|
| `Planned` | Plans exist but no code has been changed. |
| `Ready` | Dependencies satisfied; coding agent may execute. |
| `Executing` | Active implementation in progress. |
| `Blocked` | Human decision or failed gate required. |
| `Complete` | Code merged and verification gates passed. |

Current inconsistency to fix:

| File | Issue |
|---|---|
| `STATE.md` | Says progress is 0%, total plans 0, stopped at Phase 1 context gathered. |
| `ROADMAP.md` | Marks Phase 1 as checked while individual Phase 1 plans remain unchecked. |

Recommended correction:

```markdown
Phase 1: Foundation — Ready
Plans: 5/5 planned, 0/5 executed
Overall MVP progress: 0%
Current next plan: .planning/phases/01-foundation/01-01-PLAN.md
```

## 16. Execution Protocol for Coding Agents

Every downstream implementation agent should follow this loop:

1. Read `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STRUCTURE.md`.
2. Read current phase `CONTEXT.md`.
3. Read current phase `RESEARCH.md`.
4. Execute exactly one `*-PLAN.md`.
5. Modify only files listed in the plan unless a required adjacent change is discovered.
6. Run plan-level verification commands.
7. Create a `*-SUMMARY.md`.
8. Update progress state only after verification passes.
9. Do not start the next plan until dependencies are satisfied.

For Phase 1, the next executable plan is:

```text
.planning/phases/01-foundation/01-01-PLAN.md
```

## 17. Definition of MVP Done

The MVP is complete when all of the following are true:

```bash
pnpm typecheck
pnpm test
pnpm db:validate
pnpm exec playwright test
```

And:

| Done condition |
|---|
| Fastify API serves `/v1` routes. |
| WebSocket telemetry stream works through Fastify. |
| OpenRouter LLM agent can produce valid paper-trading decisions. |
| Risk gate enforces all rules using real event-derived counters. |
| Event payloads are parsed through Zod schemas. |
| React dashboard shows price chart, equity curve, trade tape, agent reasoning, and run controls. |
| Start-demo flow works from dashboard to event log to chart update. |
| No real execution path exists. |
| No API key leaks to logs or browser code. |
| Playwright smoke tests pass. |

## 18. Recommended Immediate Next Step

Execute Phase 1 in dependency order:

```text
01-01 → 01-02 + 01-04 → 01-03 → 01-05
```

Then generate Phase 2 detailed plans using the same format as Phase 1 before coding the Fastify migration.
