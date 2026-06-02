# Requirements — AI Trading Arena MVP

**Core Value:** An AI agent you can watch make paper trades in real time — the full loop from LLM decision to chart update, replayable and auditable.

**Milestone:** v1.0

---

## v1 Requirements

### Foundation

- [ ] **FOUND-01 (TEL-01)**: `packages/telemetry` implemented from scratch — Pino root logger factory with `redact.paths` covering `OPENROUTER_API_KEY`, prompt content, and authorization headers; OpenTelemetry naming constants; child-logger helpers consumed by all other packages
- [ ] **FOUND-02 (API-03)**: `ordersThisMinute` and `strategySwitchesThisHour` counters in risk gate derived from filtered event log query (not hardcoded to 0) — risk gate enforces all 8 rules correctly
- [ ] **FOUND-03 (API-04)**: Every event payload read from SQLite parsed through per-event-type Zod `safeParse` schemas from `packages/core` (no `JSON.parse(...) as T` double casts)
- [ ] **FOUND-04 (AGENT-02)**: `MarketFeedAdapter` interface in `packages/core/src/interfaces.ts` includes `onError` handler; feed adapter implementations handle WebSocket errors without silent swallowing

### API

- [ ] **API-01**: `apps/api` migrated from raw `node:http` to Fastify 5 with `buildApp()` factory export, versioned `/v1/` routes, Zod-to-JSON-Schema validation via `fastify-type-provider-zod`, `db` and `logger` registered as Fastify decorators, `preClose` hook for clean shutdown
- [ ] **API-02**: `@fastify/websocket` registered before all routes; telemetry stream available at `GET /v1/telemetry/stream` with `{ websocket: true }`; `preClose` hook closes all active sockets with code 1001; heartbeat ping/pong every 30s
- [ ] **API-03 (TEST-01)**: Vitest route tests covering all Fastify HTTP routes (status code, response envelope, Zod shape) and WebSocket route lifecycle (connect, message, close, heartbeat cleanup) via `fastify.inject` and ws client fixture

### Core Features

- [ ] **CORE-01 (PROJ-01)**: Typed pure projection functions in `packages/db/src/projections/` — `projectPositions()`, `projectPnlSnapshots()`, `projectOrderHistory()`, `projectAgentTelemetry()` — all returning typed view models from `EventRow[]` input; `buildTelemetry` wired to use projections instead of full `replayRun` scan
- [ ] **CORE-02 (AGENT-01)**: `createOpenRouterAgent()` in `packages/agents` — OpenAI SDK v6 with `baseURL: "https://openrouter.ai/api/v1"`, `z.toJSONSchema()` for structured output (not `zodResponseFormat()`), Bottleneck rate limiter, `p-retry` with `shouldConsumeRetry: false` for 429, NOOP fallback on parse failure, async `decide()` interface compatible with `PaperAgent`

### Dashboard

- [ ] **DASH-01 (WEB-01)**: `apps/web` scaffolded with React 19, Vite 8, Tailwind v3.4 (pinned, not v4), Vite dev proxy for Fastify HTTP + WebSocket routes, four-zone layout shell, `useTelemetrySocket` custom hook
- [ ] **DASH-02 (WEB-02)**: `PriceChartPanel` — Lightweight Charts v5 with `chart.addSeries(CandlestickSeries, opts)`, streaming BTC-USD ticks via WebSocket, chart + series stored in React refs, `chart.remove()` in effect cleanup, `[data-testid="price-chart"]` for Playwright
- [ ] **DASH-03 (WEB-03)**: Equity curve panel (Recharts `<ResponsiveContainer>` + `<LineChart>`) driven by `projectPnlSnapshots()` output; trade tape below it as scrolling fills log from `projectOrderHistory()`; data capped at 2,000 points
- [ ] **DASH-04 (WEB-04)**: `AgentReasoningPanel` — chronological LLM decision timeline showing action, thesis summary, evidence bullets, confidence score, model name, latency ms; risk rejections interspersed with rule identifier and threshold
- [ ] **DASH-05 (WEB-05)**: `RunControlsPanel` — start button calling `POST /v1/demo/run`, stop button calling `DELETE /v1/demo/run`, WebSocket connection status indicator (connecting / open / degraded / reconnecting / failed)

### Tests

- [ ] **TEST-01 (TEST-02)**: `playwright.config.ts` with dual `webServer` entries (Vite + Fastify); `e2e/` smoke tests — dashboard load and 4-panel visibility, WebSocket status indicator shows "open", demo run button triggers trade tape entry, `page.routeWebSocket()` for mocked WebSocket assertions

---

## v2 / Deferred

The following are expected by users eventually but deferred beyond MVP:

- Strategy hot-loading UI — manifest upload/activation from browser
- Model picker UI — select OpenRouter model from dashboard
- Multiple symbol support — hardcode BTC-USD for v1
- Historical replay UI — `pnpm sim:replay` CLI is sufficient for v1
- Export endpoints — CSV/JSON run export
- Agent-vs-agent competition mode — concurrent multi-agent runs
- OpenRouter API key onboarding UI — env var is sufficient for local tool

---

## Out of Scope

- Real brokerage, exchange, wallet-signing, custody, or fund-moving adapters — core simulator invariant; risk gate categorically rejects; never add
- Leverage in any form — risk gate rejects; never enable in MVP
- Production deployment, cloud hosting, multi-user auth — local-only tool
- Paid subscription, billing, SaaS features — out of scope for research platform

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| FOUND-01 (TEL-01) | Phase 1 | — | Not started |
| FOUND-02 (API-03) | Phase 1 | — | Not started |
| FOUND-03 (API-04) | Phase 1 | — | Not started |
| FOUND-04 (AGENT-02) | Phase 1 | — | Not started |
| API-01 | Phase 2 | — | Not started |
| API-02 | Phase 2 | — | Not started |
| API-03 (TEST-01) | Phase 2 | — | Not started |
| CORE-01 (PROJ-01) | Phase 3 | — | Not started |
| CORE-02 (AGENT-01) | Phase 3 | — | Not started |
| DASH-01 (WEB-01) | Phase 4 | — | Not started |
| DASH-02 (WEB-02) | Phase 4 | — | Not started |
| DASH-03 (WEB-03) | Phase 4 | — | Not started |
| DASH-04 (WEB-04) | Phase 4 | — | Not started |
| DASH-05 (WEB-05) | Phase 4 | — | Not started |
| TEST-01 (TEST-02) | Phase 5 | — | Not started |

---
*Last updated: 2026-06-02 after roadmap creation — all 15 requirements mapped to phases*
