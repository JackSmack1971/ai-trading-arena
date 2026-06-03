# Roadmap: AI Trading Arena MVP

## Overview

The simulator core — event-sourced SQLite log, paper broker, risk gate, feed adapters, strategy packs — is solid and tested. This roadmap completes the surface layer: fix two correctness bugs and build shared telemetry (Phase 1), migrate the API to Fastify 5 (Phase 2), implement materialized projections and the OpenRouter LLM agent (Phase 3), build the React dashboard (Phase 4), and close with Playwright E2E smoke tests (Phase 5). Every phase delivers a verifiable, coherent capability before the next phase begins.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Fix two risk-gate correctness bugs, implement packages/telemetry, and harden event payload parsing *(Complete)*
- [ ] **Phase 2: API Migration** - Migrate apps/api from raw node:http to Fastify 5 with buildApp() export and @fastify/websocket
- [ ] **Phase 3: Core Features** - Implement materialized projections and wire the OpenRouter LLM agent (parallel streams)
- [ ] **Phase 4: React Dashboard** - Build the four-panel React dashboard wired to Fastify WebSocket
- [ ] **Phase 5: E2E Tests** - Playwright configuration and smoke tests covering the full dashboard flow

## Phase Details

### Phase 1: Foundation

**Goal**: Correct simulator with reliable structured logging — risk gate enforces all 8 rules, event payloads are Zod-validated, and packages/telemetry exists
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01 (TEL-01), FOUND-02 (API-03), FOUND-03 (API-04), FOUND-04 (AGENT-02)
**Success Criteria** (what must be TRUE):

  1. `pnpm typecheck` passes across all packages with packages/telemetry wired in as a workspace dependency
  2. Risk gate Vitest suite covers all 8 rules with boundary-value assertions, including ordersThisMinute and strategySwitchesThisHour derived from event log queries (not hardcoded to 0)
  3. No `JSON.parse(...) as T` double-cast patterns remain in apps/api/src — grep confirms zero matches
  4. `MarketFeedAdapter` interface in packages/core/src/interfaces.ts includes an `onError` handler signature

**Plans**: 5 plans

Plans:

- [x] 01-01-PLAN.md � Core schema additions: STRATEGY_SWITCH_REQUESTED event type, SimEventPayloadSchemas dispatch map, MarketFeedAdapter.onError interface (Wave 1)
- [x] 01-02-PLAN.md � DB windowed query helpers: countOrdersInWindow, countStrategySwitchesInWindow (Wave 2)
- [x] 01-03-PLAN.md � API + worker call site fixes: JSON.parse cast removal, real risk counter wiring, unsafe adapter cast removal (Wave 3)
- [x] 01-04-PLAN.md � packages/telemetry: Pino logger factory with redaction, OTel naming constants (Wave 2, parallel with 01-02)
- [x] 01-05-PLAN.md � db:validate smoke-test script, phase gate verification (Wave 4)
- [x] 01-06-PLAN.md � SC-2 gap closure: boundary-value tests for 4 untested PaperRiskGate rules (Wave 5)

### Phase 2: API Migration

**Goal**: Fastify 5 with buildApp() factory, versioned /v1/ routes, @fastify/websocket telemetry endpoint, and Fastify route tests — demo simulation runs end-to-end through the new server
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03 (TEST-01)
**Success Criteria** (what must be TRUE):

  1. `POST /v1/demo/run` returns 200 with a Zod-validated response envelope
  2. `GET /v1/telemetry/stream` accepts a WebSocket upgrade and broadcasts telemetry events at 2-second intervals
  3. `fastify.inject` tests pass for all HTTP route contracts (status code, response envelope, Zod shape) and WebSocket lifecycle (connect, message, close, heartbeat cleanup)
  4. Hash chain verification passes on a full demo run through the migrated Fastify server

**Plans**: TBD

### Phase 3: Core Features

**Goal**: Materialized read-model projections replace full log scans in buildTelemetry, and createOpenRouterAgent() produces valid AgentDecision objects via OpenRouter
**Mode**: mvp
**Depends on**: Phase 1 (CORE-02 needs risk gate fixed); Phase 2 provides API contract context
**Requirements**: CORE-01 (PROJ-01), CORE-02 (AGENT-01)
**Success Criteria** (what must be TRUE):

  1. `buildTelemetry` calls projection functions (not replayRun scan) — confirmed by removing the replayRun import from the telemetry build path
  2. Projection Vitest tests cover empty event log, single event, and multi-event scenarios for all four projection functions
  3. `createOpenRouterAgent()` produces a valid AgentDecision through a Vitest fixture using a mocked OpenRouter response
  4. Round-trip fixture passes: `z.toJSONSchema(AgentDecisionSchema)` serializes correctly, mocked response parses through safeParse, result is a valid AgentDecision (not NOOP)

**Plans**: TBD
**Note**: PROJ-01 plan and AGENT-01 plan can execute in parallel within this phase.

### Phase 4: React Dashboard

**Goal**: Four-panel React dashboard loads at localhost:5173, all panels are visible, and the full loop from demo run button to chart update works
**Mode**: mvp
**Depends on**: Phase 2 (stable /v1/ routes), Phase 3 (projections and LLM agent)
**Requirements**: DASH-01 (WEB-01), DASH-02 (WEB-02), DASH-03 (WEB-03), DASH-04 (WEB-04), DASH-05 (WEB-05)
**Success Criteria** (what must be TRUE):

  1. Dashboard loads at localhost:5173 showing all four panels with no console errors
  2. `[data-testid="price-chart"]` canvas element is visible and receives live BTC-USD tick updates from WebSocket
  3. Equity curve panel renders with at least one data point after a demo run is triggered
  4. AgentReasoningPanel shows the last LLM decision with action, thesis text, and model name populated

**Plans**: TBD
**Note**: WEB-01 scaffold unblocks all panels. WEB-03/WEB-04 can execute in parallel after WEB-02.
**UI hint**: yes

### Phase 5: E2E Tests

**Goal**: Playwright smoke tests verify the full dashboard flow — load, WebSocket connection, demo run triggering a trade tape entry
**Mode**: mvp
**Depends on**: Phase 2 (Fastify health route), Phase 4 (React dashboard)
**Requirements**: TEST-01 (TEST-02)
**Success Criteria** (what must be TRUE):

  1. `playwright.config.ts` dual webServer entries start Fastify (port 3000) and Vite (port 5173) and both are ready before tests run
  2. `dashboard.spec.ts` asserts all four panels are visible on load
  3. `run-controls.spec.ts` asserts that clicking the start button produces a trade tape entry within 10 seconds
  4. `websocket.spec.ts` uses `page.routeWebSocket()` to mock the telemetry stream and asserts the connection status indicator shows "open"

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/6 | Complete    | 2026-06-03 |
| 2. API Migration | 0/TBD | Not started | - |
| 3. Core Features | 0/TBD | Not started | - |
| 4. React Dashboard | 0/TBD | Not started | - |
| 5. E2E Tests | 0/TBD | Not started | - |

---
*Created: 2026-06-02 — AI Trading Arena MVP v1.0*
