# AI Trading Arena

## What This Is

A local-first, event-sourced AI paper-trading simulator where LLM agents (via OpenRouter) observe live market data, make trading decisions, and compete in a fully replayable arena — all visible in a React dashboard. It is a research and experimentation platform, not a live-trading system. No real funds, no real orders, no real exchange connectivity.

## Core Value

An AI agent you can watch make paper trades in real time — the full loop from LLM decision to chart update, replayable and auditable.

## Requirements

### Validated

<!-- Existing working capabilities confirmed in codebase -->

- ✓ Append-only hash-chained event log (SQLite + Drizzle, `packages/db`) — existing
- ✓ Paper broker with market/limit fills, fees, slippage, P&L tracking (`packages/broker-paper`) — existing
- ✓ Deterministic risk gate — final authority, audit-logged, rejects leverage and real orders (`packages/broker-paper/src/risk-gate.ts`) — existing
- ✓ MoneyDecimal (Decimal.js precision-28) for all money arithmetic — existing
- ✓ Deterministic demo simulation loop (POST /api/demo/run → event log → hash chain verify) — existing
- ✓ WebSocket telemetry streaming (/ws/runs/:runId/telemetry, 2s poll) — existing
- ✓ Coinbase + Binance WebSocket feed adapters with Bottleneck rate limiting (`packages/feeds`) — existing
- ✓ Strategy pack system — manifest validation, loader, registry, 5 built-in strategies (`packages/strategies`) — existing
- ✓ Deterministic paper agents interface (PaperAgent, createDeterministicPaperAgent) — existing
- ✓ Hash chain verification (replayRun + verifyHashChain) — existing

### Active

<!-- MVP completion scope -->

- [ ] **API-01**: Migrate `apps/api` from raw Node `http.createServer` to Fastify with versioned `/v1/` routes, Zod-to-JSON-Schema validation, preValidation hooks, and typed route generics
- [ ] **API-02**: Register `@fastify/websocket` and migrate WebSocket telemetry endpoint to Fastify plugin with inbound Zod message validation
- [ ] **API-03**: Fix `ordersThisMinute` and `strategySwitchesThisHour` counters — derive from event log (currently hardcoded 0, bypassing two risk rules)
- [ ] **API-04**: Replace `JSON.parse(...) as T` event payload casts with per-event-type Zod `safeParse` schemas from `packages/core`
- [ ] **TEL-01**: Implement `packages/telemetry` — shared Pino root logger with redaction, child-logger helpers, and OpenTelemetry naming constants
- [ ] **AGENT-01**: Implement OpenRouter LLM agent in `packages/agents` — OpenAI SDK → `https://openrouter.ai/api/v1`, Zod structured output, Bottleneck/p-retry wrapping
- [ ] **AGENT-02**: Add `onError` to `MarketFeedAdapter` interface in `packages/core/src/interfaces.ts` (removes unsafe cast in worker)
- [ ] **PROJ-01**: Implement materialized read-model projections in `packages/db/src/projections/` for positions, P&L, order history, and agent telemetry (replace full-log scan in buildTelemetry)
- [ ] **WEB-01**: Migrate `apps/web` from vanilla DOM script to React + Vite + Tailwind per `react-vite-tailwind.md`
- [ ] **WEB-02**: Price chart panel — Lightweight Charts candlestick/line series streaming live from Fastify WebSocket feed
- [ ] **WEB-03**: Equity curve + P&L panel — Recharts line chart of agent portfolio value over time, per-agent breakdown
- [ ] **WEB-04**: Agent reasoning panel — display LLM agent decision trace (model, prompt summary, decision, rationale) from telemetry stream
- [ ] **WEB-05**: Run controls — start/stop simulation, switch strategies, trigger replay — all from the dashboard UI
- [ ] **TEST-01**: Fastify API route tests using `fastify.inject` covering HTTP routes and WebSocket lifecycle with Zod-shaped response assertions
- [ ] **TEST-02**: Playwright E2E configuration (`playwright.config.ts`, `e2e/`) and smoke tests — dashboard load, WebSocket connection status, demo run button flow

### Out of Scope

- Real brokerage, exchange execution, wallet-signing, custody, or fund-moving adapters — core simulator invariant; risk gate categorically rejects
- Cloud/hosted deployment — local-first design; SQLite single-process ownership
- Multi-agent arena competition (concurrent agents against live feed) — deferred to next milestone
- Strategy hot-loading via API/UI — registry and executor exist; hot-reload wiring deferred
- Polymarket, Kraken, DexScreener feed adapters — Coinbase + Binance sufficient for MVP
- Exportable research logs / file-download endpoint — deferred
- Historical replay UI (web-visible) — CLI replay exists; web surface deferred
- OpenRouter API key onboarding UI — env var (`OPENROUTER_API_KEY`) is sufficient for MVP
- Agent-vs-agent competition leaderboard — deferred

## Context

**What's already built:**
The simulator core is solid — event-sourced, hash-chained, deterministic. The paper broker, risk gate, feed adapters, strategy pack, and agent interface all exist and work. The current gap is the surface layer: the API is on raw Node http (not Fastify), the telemetry package is an empty shell, the agents are rule-based (not LLM-driven), and the web frontend is a stub that renders data as raw `<span>` height bars.

**Primary gaps identified in codebase analysis (2026-06-01):**
1. No OpenRouter/LLM agent — the "AI" in AI Trading Arena is absent
2. `apps/api` violates all Fastify rules (no plugin system, no schema validation, no typed routes)
3. `packages/telemetry` and `packages/ui` export nothing
4. `apps/web` has no React, no Vite plugins, no Lightweight Charts, no Recharts
5. Two risk rules (`MAX_ORDERS_PER_MINUTE`, `MAX_STRATEGY_SWITCHES_PER_HOUR`) permanently bypassed by hardcoded zeros
6. No Playwright configuration or E2E directory
7. Event payload deserialization uses unchecked `JSON.parse as T` casts throughout

**Tech stack:** TypeScript 5.4+ strict, pnpm monorepo, Node.js ≥20, Zod v4, Drizzle + better-sqlite3, Decimal.js, Pino, OpenTelemetry, Bottleneck, p-retry, Vite + React + Tailwind (frontend target), Lightweight Charts v5, Recharts v3, Vitest, Playwright.

## Constraints

- **No real execution:** PaperRiskGate categorically rejects `executionMode === 'LIVE'` or `executionVenue === 'REAL'` — non-negotiable invariant
- **Local-first SQLite:** better-sqlite3 is synchronous; single-process write ownership; WAL mode at startup
- **TypeScript strict:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules` — no `any` escapes at domain boundaries
- **Zod as source of truth:** All schemas live in `packages/core`; TypeScript types derived via `z.infer`; never vice versa
- **Secret isolation:** `OPENROUTER_API_KEY` env-var only; never logged, never in browser bundles
- **Replayability:** Every state change is a persisted, hash-chained event; no in-memory-only mutations are final

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first SQLite, not cloud DB | Replayability + simplicity + no hosting cost; single developer | — Pending |
| OpenRouter via OpenAI SDK `baseURL` override | Same SDK, multiple model providers; no new client library | — Pending |
| Fastify migration before new API features | Raw http violates all API rules; better to migrate clean than add tech debt | — Pending |
| Materialized projections before React dashboard | Full-log scan in buildTelemetry won't scale past demo; projections required for real UI | — Pending |
| Start with one LLM agent, expand later | Validate the loop works before adding multi-agent complexity | — Pending |
| Full test coverage (Vitest + Playwright) for MVP | Simulator correctness depends on risk gate and broker math; can't ship without it | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-01 after initialization*
