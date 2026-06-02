<!-- refreshed: 2026-06-01 -->
# Architecture

**Analysis Date:** 2026-06-01

## System Overview

AI Trading Arena is a local-first, event-sourced paper-trading simulator. Market feed data flows through WebSocket adapters into a hash-chained append-only SQLite event log. Deterministic paper agents observe market state through typed observation packets, emit schema-validated decisions, which pass through a non-AI risk gate before reaching the paper broker. All state-changing actions produce persisted events; the entire run is replayable from `seq=0`. No real brokerage, exchange execution, wallet, or fund-moving adapters exist.

## System Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                     apps/web  (React UI)                        │
│  WebSocket → telemetry.snapshot polling every 2 s               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ws /ws/runs/:runId/telemetry
                           │ HTTP GET /api/runs/:runId/{events,telemetry,summary}
┌──────────────────────────▼──────────────────────────────────────┐
│                     apps/api  (HTTP + WebSocket server)         │
│  `apps/api/src/index.ts`                                        │
│  Node http.createServer + ws.WebSocketServer (no Fastify yet)   │
│  Builds telemetry projections from event log; runs demo sim     │
└──────┬──────────────────────────────────────┬───────────────────┘
       │ @arena/db                            │ @arena/broker-paper
       │ @arena/agents                        │ @arena/core
       │ @arena/core                          │
┌──────▼──────────────────┐   ┌──────────────▼─────────────────────┐
│    packages/db          │   │    packages/broker-paper            │
│  Append-only event log  │   │  PaperBroker, PaperRiskGate         │
│  SQLite + Drizzle       │   │  fills, fees, slippage, positions   │
│  Hash-chain verify      │   │  P&L, ledger                        │
└──────▲──────────────────┘   └─────────────▲──────────────────────┘
       │                                     │
┌──────┴──────────────────┐   ┌─────────────┴──────────────────────┐
│    packages/core        │   │    packages/agents                  │
│  All Zod schemas        │   │  PaperAgent interface               │
│  SimEvent types         │   │  createDeterministicPaperAgent      │
│  MoneyDecimal           │   │  (OpenRouter client: planned)       │
│  SimEventBus            │   └─────────────────────────────────────┘
│  Constants, interfaces  │
└──────▲──────────────────┘
       │
┌──────┴──────────────────┐   ┌────────────────────────────────────┐
│    packages/feeds       │   │    apps/worker                     │
│  CoinbaseFeedAdapter    │   │  runWorker(): connects feeds,       │
│  BinanceFeedAdapter     │   │  pipes events to db                 │
│  Bottleneck limiters    │   │  AbortSignal shutdown               │
│  Zod normalizers        │   └────────────────────────────────────┘
└─────────────────────────┘
       │
┌──────┴──────────────────┐
│    packages/strategies  │
│  StrategyManifest Zod   │
│  Loader + Registry      │
│  5 built-in strategies  │
│  Signal emission only   │
└─────────────────────────┘
```

## Package Graph

| Package | pnpm name | Depends on | Role |
|---------|-----------|------------|------|
| `packages/core` | `@arena/core` | zod, decimal.js, eventemitter3, nanoid, ts-pattern | Domain schemas, event types, money primitives, interfaces, constants |
| `packages/db` | `@arena/db` | better-sqlite3, drizzle-orm, nanoid, zod | Append-only event store, hash-chain, replay, projections |
| `packages/broker-paper` | `@arena/broker-paper` | `@arena/core` | Simulated fills, fees, slippage, positions, P&L, risk gate |
| `packages/feeds` | `@arena/feeds` | `@arena/core`, bottleneck, ws, zod | Public market data WebSocket adapters (Coinbase, Binance) |
| `packages/strategies` | `@arena/strategies` | `@arena/core` | Strategy manifest loader, registry, signal executor, 5 built-ins |
| `packages/agents` | `@arena/agents` | `@arena/core` | PaperAgent interface + deterministic demo agents (OpenRouter: planned) |
| `packages/telemetry` | `@arena/telemetry` | (none yet) | Pino/OpenTelemetry exports (stub) |
| `packages/ui` | `@arena/ui` | (none yet) | React component library (stub) |
| `apps/api` | `@arena/api` | `@arena/agents`, `@arena/broker-paper`, `@arena/core`, `@arena/db`, drizzle-orm, pino, ws | HTTP + WebSocket API, demo simulator orchestration |
| `apps/worker` | `@arena/worker` | `@arena/agents`, `@arena/broker-paper`, `@arena/core`, `@arena/db`, `@arena/feeds`, drizzle-orm, pino | Live feed ingestion worker |
| `apps/web` | `@arena/web` | (none yet) | React dashboard (stub) |

## Key Bounded Contexts

### Event-Sourced Simulator Core
- **Location:** `packages/core/src/events/`, `packages/db/src/`
- **Responsibility:** Append-only hash-chained event log as the single source of truth. Every simulator state transition produces a `SimEvent` row in SQLite. Replay is achieved by reading all rows for a `runId` ordered by `seq`.
- **Key files:**
  - `packages/core/src/events/types.ts` — 20 `SimEventType` enum values and typed payload schemas
  - `packages/db/src/repositories/events.ts` — `appendEventPayload`, `replayRun`, `verifyHashChain`
  - `packages/db/src/schema.ts` — single `events` table with `(runId, seq)` unique index
  - `packages/core/src/events/bus.ts` — in-process `SimEventBus` (eventemitter3)

### Agent Decision
- **Location:** `packages/agents/src/`
- **Responsibility:** The `PaperAgent` interface defines `decide(observation: AgentObservation): AgentDecision`. Current implementation is deterministic (`createDeterministicPaperAgent`). OpenRouter LLM client is planned but not yet wired.
- **Key files:**
  - `packages/agents/src/index.ts` — `PaperAgent`, `createDeterministicPaperAgent`, `createDemoPaperAgents`
  - `packages/core/src/schemas/agent.ts` — `AgentDecisionSchema`, `AgentObservationSchema`

### Feed Ingestion
- **Location:** `packages/feeds/src/`, `apps/worker/src/`
- **Responsibility:** Public WebSocket market data from Coinbase and Binance. Each adapter implements `MarketFeedAdapter` from `@arena/core`. Events are normalized through Zod schemas and persisted via `appendEventPayload`. Bottleneck rate limiters govern reconnects and request pacing.
- **Key files:**
  - `packages/feeds/src/clients/coinbase.ts` — WebSocket client with heartbeat, reconnect, Bottleneck
  - `packages/feeds/src/clients/binance.ts` — Binance WebSocket adapter
  - `packages/feeds/src/normalizers/coinbase.ts`, `packages/feeds/src/normalizers/binance.ts` — Zod normalization
  - `packages/feeds/src/limiters.ts` — shared Bottleneck limiter factory
  - `apps/worker/src/index.ts` — `runWorker()` wires adapters to `appendEventPayload` to SQLite

### Risk Gate
- **Location:** `packages/broker-paper/src/risk-gate.ts`
- **Responsibility:** Deterministic, non-AI gate evaluated before every paper order or strategy switch. Returns typed `RiskGateDecision` (`PASSED` | `REJECTED`) with a full `RiskEvent` audit record. Rules enforced: real-execution block, no-leverage, max drawdown %, max orders/min, max strategy switches/hour, no negative cash, max position size %, max symbol exposure %, max total exposure %.
- **Key files:**
  - `packages/broker-paper/src/risk-gate.ts` — `PaperRiskGate.evaluateOrder()`, `evaluateStrategySwitch()`
  - `packages/core/src/schemas/risk.ts` — `RiskConfig`, `RiskEvent`, `RiskRuleId`

### Paper Broker
- **Location:** `packages/broker-paper/src/`
- **Responsibility:** Simulated order lifecycle: market/limit order placement, fill computation (with slippage and fees), position tracking, P&L snapshots, and cash ledger. Emits broker events via `onEvent` callback which are persisted to the event log by the caller.
- **Key files:**
  - `packages/broker-paper/src/broker.ts` — `PaperBroker` class
  - `packages/broker-paper/src/fills.ts` — `computeMarketFill`, `computeLimitFill`
  - `packages/broker-paper/src/fee-model.ts` — `TakerMakerFeeModel`
  - `packages/broker-paper/src/slippage-model.ts` — `SpreadSlippageModel`
  - `packages/broker-paper/src/positions.ts` — `PositionTracker`
  - `packages/broker-paper/src/pnl.ts` — `PnLTracker`
  - `packages/broker-paper/src/ledger.ts` — `CashLedger`
  - `packages/broker-paper/src/money/decimal.ts` — `MoneyDecimal` (precision 28, ROUND_HALF_UP)

### Strategy Pack
- **Location:** `packages/strategies/src/`
- **Responsibility:** Strategy manifests (Zod-validated), hot-loadable strategy registry, signal executor. Strategies emit typed `StrategySignal` values only — never orders. Five built-in strategies included.
- **Key files:**
  - `packages/strategies/src/manifest.ts` — manifest validation
  - `packages/strategies/src/loader.ts` — strategy file loader
  - `packages/strategies/src/registry.ts` — `StrategyRegistry`
  - `packages/strategies/src/executor.ts` — signal execution
  - `packages/strategies/src/built-ins/` — 5 built-in strategies (do-nothing, momentum, mean-reversion, orderbook-imbalance, volatility-breakout)

### API Layer
- **Location:** `apps/api/src/index.ts`
- **Responsibility:** Node.js `http.createServer` + `ws.WebSocketServer`. Exposes HTTP endpoints for demo run, event replay, telemetry, and summary. WebSocket endpoint at `/ws/runs/:runId/telemetry` broadcasts `telemetry.snapshot` every 2 seconds. Runs deterministic demo simulation on demand.
- **Note:** Uses raw Node.js HTTP (not Fastify yet). Fastify migration is a future phase.

## Data Flow

### Primary: Deterministic Demo Simulation (current MVP)

```
POST /api/demo/run
  → apps/api: runDeterministicDemo()
    → createDemoPaperAgents()                      [packages/agents]
    → createDemoTicks()  (3 ticks, BTC-USD)
    → for each tick:
        appendEventPayload(MARKET_TICK_RECEIVED)   [packages/db]
        createDemoSignals()
          → appendEventPayload(STRATEGY_SIGNAL_CREATED)
        agent.decide(observation)                  [packages/agents]
          → AgentDecisionSchema.parse()            [packages/core]
        appendEventPayload(AGENT_DECISION_RECEIVED)
        broker.placeMarketOrder()                  [packages/broker-paper]
          → PaperRiskGate.evaluateOrder()
            REJECTED → appendBrokerEvent(RISK_CHECK_REJECTED)
            PASSED   → appendBrokerEvent(RISK_CHECK_PASSED)
                     → fills, position update, P&L snapshot
                     → appendBrokerEvent(PAPER_ORDER_CREATED)
                     → appendBrokerEvent(PAPER_ORDER_FILLED)
                     → appendBrokerEvent(POSITION_UPDATED)
                     → appendBrokerEvent(PNL_SNAPSHOT_CREATED)
        broker.processMarketTick()
  → replayRun(db, runId) → verifyHashChain()
  → return { runId, eventCount, hashChainValid, agents }
```

### Secondary: Live Feed Ingestion (apps/worker)

```
runWorker()
  → CoinbaseFeedAdapter.connect() + subscribe()   [packages/feeds]
  → adapter.onEvent(normalizedEvent)
      → appendEventPayload(MARKET_TICK_RECEIVED)  [packages/db]
  → on terminal error: stop all adapters → process.exit(1)
```

### Telemetry Polling (WebSocket)

```
ws /ws/runs/:runId/telemetry
  → on connection: buildTelemetry(db, runId)
      → replayRun() — full forward replay from SQLite
      → project: marketTicks, equityPoints, agentTelemetry
      → verifyHashChain()
  → setInterval(2000ms): repeat buildTelemetry()
  → sendWsJson({ type: 'telemetry.snapshot', data })
      [backpressure guard: bufferedAmount > 64KB → drop frame + warn log]
```

## Key Design Decisions

1. **Hash-chained append-only event log:** Each event stores `payloadHash = sha256(payloadJson + previousHash)`. `verifyHashChain()` re-derives all hashes to detect tampering. Events are never updated or deleted. (`packages/db/src/repositories/events.ts`)

2. **Risk gate is terminal:** `PaperRiskGate.evaluateOrder()` returns final `PASSED` or `REJECTED` — no retry paths bypass it. Rejection is written as a `RISK_CHECK_REJECTED` event with full audit fields. (`packages/broker-paper/src/risk-gate.ts`)

3. **Schema-first with `@arena/core`:** All domain types (`AgentDecision`, `NormalizedMarketEvent`, `PaperOrder`, `RiskEvent`) are Zod schemas in `packages/core/src/schemas/`. TypeScript types are `z.infer`. Cross-package imports use package names, never relative paths across package roots.

4. **Strategy signals are not orders:** Strategies emit `StrategySignal` (direction: `long | short | reduce_long | none`). Conversion to paper orders happens only after agent decisions and risk gate approval. (`packages/core/src/schemas/strategy.ts`)

5. **`MoneyDecimal` for all money:** A cloned Decimal.js constructor with `precision: 28` and `ROUND_HALF_UP`. Serialized as fixed-point strings in SQLite. (`packages/broker-paper/src/money/decimal.ts`, `packages/core/src/money/decimal.ts`)

6. **No Fastify yet:** `apps/api` uses raw Node `http.createServer`. Fastify + `@fastify/websocket` migration is planned. Route rules in `.claude/rules/` describe the target state.

7. **Deterministic demo over live LLM:** `packages/agents` currently provides only deterministic rule-based agents for the MVP demo loop. OpenRouter/LLM integration is planned.

8. **`MarketFeedAdapter` interface:** Feed adapters implement `connect`, `subscribe`, `disconnect`, `onEvent`, `onError` from `packages/core/src/interfaces.ts`. Adapters are injected into the worker, enabling test substitution with fake feeds.

## Architectural Constraints

- **No real execution:** `PaperRiskGate` categorically rejects any `PlaceOrderRequest` where `executionMode === 'LIVE'` or `executionVenue === 'REAL'`. (`packages/broker-paper/src/risk-gate.ts` line 103)
- **No leverage:** Requests with `leverageMultiplier > 1` are rejected at the risk gate. (`packages/broker-paper/src/risk-gate.ts` line 107)
- **Single-process SQLite:** `better-sqlite3` is synchronous. All reads/writes run in one Node.js process. WAL mode enabled at startup.
- **Replayability:** Every state change is a persisted event. No in-memory-only state mutations are final.
- **Secret isolation:** Feeds use no API credentials. OpenRouter key is env-var only, never logged.

## Anti-Patterns

### Writing directly past the risk gate

**What happens:** Caller mutates broker state or persists events without calling `PaperRiskGate.evaluateOrder()`.
**Why it's wrong:** Bypasses the deterministic audit trail and violates the core simulator invariant.
**Do this instead:** Always use `broker.placeMarketOrder()` which internally calls `riskGate.evaluateOrder()` before any mutation. (`packages/broker-paper/src/broker.ts`)

### Cross-package relative imports

**What happens:** `import { MoneyDecimal } from '../../core/src/money/decimal'` from an app or sibling package.
**Why it's wrong:** Breaks TypeScript project references, pnpm workspace resolution, and makes refactoring fragile.
**Do this instead:** Import as `import { MoneyDecimal } from '@arena/core'`.

### Sending agent decision directly to broker without schema parse

**What happens:** Passing raw LLM or agent output to `broker.placeMarketOrder()` without `AgentDecisionSchema.parse()`.
**Why it's wrong:** Invalid model output must become `NOOP` + audit evidence, not an attempted order.
**Do this instead:** Call `AgentDecisionSchema.parse(rawOutput)` first; on failure emit `AGENT_DECISION_INVALID` event and return NOOP. (See `apps/api/src/index.ts` line 361 for the current demo pattern.)

## Error Handling

**Strategy:** Errors are structured Pino log events + SQLite audit rows for rejections. No silent swallows at domain boundaries.

**Patterns:**
- Risk gate rejections → `RISK_CHECK_REJECTED` SimEvent row + `RiskEvent` payload with rule ID, threshold, observed value
- Feed terminal errors → Pino `fatal` log → all adapters stopped → process exit code 1
- Agent decision parse failures → `AGENT_DECISION_INVALID` SimEvent (planned; current demo never fails validation)
- WebSocket backpressure → frame dropped with Pino `warn`, `bufferedAmount` logged

## Cross-Cutting Concerns

**Logging:** Pino loggers with `{ name: 'api' }` / `{ name: 'worker' }` at process level; child loggers per adapter/module.
**Validation:** Zod schemas at every external boundary (feed events, agent decisions, broker payloads). `parse()` at trusted server boundaries; `safeParse()` for user-facing or batch flows.
**Authentication:** None (local-first simulator; no auth layer exists yet).
**Money arithmetic:** `MoneyDecimal` (Decimal.js clone) for all prices, balances, P&L, fees. Serialized as decimal strings in SQLite.

---

*Architecture analysis: 2026-06-01*
