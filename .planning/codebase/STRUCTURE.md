# Codebase Structure

**Analysis Date:** 2026-06-01

## Root Layout

```
ai-trading-arena/
├── apps/                   # Deployable applications
│   ├── api/                # HTTP + WebSocket server (Node http + ws)
│   ├── web/                # React dashboard (stub)
│   └── worker/             # Live feed ingestion worker
├── packages/               # Shared workspace packages
│   ├── core/               # Domain schemas, event types, money primitives
│   ├── db/                 # SQLite event store (Drizzle + better-sqlite3)
│   ├── broker-paper/       # Paper broker, risk gate, fills, P&L
│   ├── feeds/              # Public market feed adapters (Coinbase, Binance)
│   ├── strategies/         # Strategy manifests, loader, registry, built-ins
│   ├── agents/             # PaperAgent interface + demo agents
│   ├── telemetry/          # Pino/OpenTelemetry exports (stub)
│   └── ui/                 # React component library (stub)
├── strategies/             # User-authored strategy packs (outside packages/)
│   ├── examples/           # Example strategy manifests
│   └── test-strategy/      # Test fixture strategy
├── docs/                   # Architecture blueprints and library maps
├── tests/                  # Cross-package integration test fixtures
├── scripts/                # CLI utilities (create-strategy, etc.)
├── .claude/                # Claude Code framework: rules, skills, hooks, agents
├── .planning/              # GSD planning documents
│   └── codebase/           # Codebase map documents (this directory)
├── AGENTS.md               # Non-negotiable invariants and architecture guardrails
├── CLAUDE.md               # Project instructions for Claude Code
├── package.json            # Root pnpm workspace (name: trader-arena)
├── pnpm-workspace.yaml     # Workspace globs: apps/*, packages/*
├── pnpm-lock.yaml          # Lockfile
├── tsconfig.json           # Root TypeScript config with project references
├── tsconfig.base.json      # Shared compiler options base
├── vitest.config.ts        # Root Vitest configuration
├── eslint.config.js        # ESLint flat config
└── prettier.config.js      # Prettier configuration
```

## Apps

### `apps/api` — `@arena/api`

**Entry point:** `apps/api/src/index.ts`

**Responsibilities:**
- Node.js `http.createServer` + `ws.WebSocketServer` (raw Node, no Fastify yet)
- HTTP routes: `GET /health`, `POST /api/demo/run`, `GET /api/runs/:runId/events`, `GET /api/runs/:runId/telemetry`, `GET /api/runs/:runId/summary`
- WebSocket: `ws /ws/runs/:runId/telemetry` — broadcasts `telemetry.snapshot` every 2 s
- Demo simulation orchestration: `runDeterministicDemo()` wires agents + broker + event log
- Telemetry projection: `buildTelemetry()` replays full event log and projects chart/equity data
- Drizzle migration on startup from `packages/db/drizzle/`

**Key exports:** `createApiServer`, `buildTelemetry`, `ApiServerOptions`, `ArenaTelemetry`

### `apps/web` — `@arena/web`

**Entry point:** `apps/web/src/index.ts`

**Responsibilities:** React dashboard UI (stub — not yet implemented)

### `apps/worker` — `@arena/worker`

**Entry point:** `apps/worker/src/index.ts`

**Responsibilities:**
- `runWorker()`: connects market feed adapters, subscribes to symbols, pipes `NormalizedMarketEvent` to `appendEventPayload`
- Terminal error handling: stops all adapters and signals caller
- `AbortSignal` support for graceful shutdown
- `SIGINT`/`SIGTERM` process handlers when run as entry point
- Replay utility: `apps/worker/src/replay.ts`
- Demo runner: `apps/worker/src/demo.ts`

**Key exports:** `runWorker`, `WorkerOptions`, `WorkerHandle`

## Packages

### `packages/core` — `@arena/core`

**Role:** Single source of truth for all domain contracts. Every other package imports schemas and types from here.

**Key exports:**
- `MoneyDecimal`, `ZERO_MONEY`, `roundForLedger`, `roundForDisplay`, `roundForSettlement` — money primitives (`src/money/decimal.ts`)
- `NormalizedMarketEventSchema`, `MarketStateSummarySchema`, `BarDataSchema` — market data (`src/schemas/market.ts`)
- `AgentDecisionSchema`, `AgentObservationSchema`, `AgentConfigSchema` — agent contracts (`src/schemas/agent.ts`)
- `PaperOrderSchema`, `PaperFillSchema`, `PositionSchema`, `PnLSnapshotSchema`, `PortfolioSummarySchema` — broker types (`src/schemas/broker.ts`)
- `RiskConfigSchema`, `DefaultRiskConfig`, `RiskEventSchema`, `RiskRuleIdSchema` — risk gate contracts (`src/schemas/risk.ts`)
- `StrategyManifestSchema`, `StrategySignalSchema`, `StrategyDslSchema` — strategy contracts (`src/schemas/strategy.ts`)
- `SimEventTypeSchema`, `SimEventSchema`, typed payload schemas — event sourcing (`src/events/types.ts`)
- `SimEventBus`, `createEventBus` — in-process event bus (`src/events/bus.ts`)
- `MarketFeedAdapter`, `Strategy`, `StrategyContext` interfaces (`src/interfaces.ts`)
- Constants: `HEARTBEAT_INTERVAL_MS`, `MAX_RECONNECT_ATTEMPTS`, `AGENT_DECISION_TIMEOUT_MS`, etc. (`src/constants.ts`)

### `packages/db` — `@arena/db`

**Role:** Append-only event store. Single SQLite table (`events`) with hash-chain integrity.

**Key exports:**
- `createDb`, `ArenaDb` — database connection (`src/client.ts`)
- `appendEvent`, `appendEvents`, `appendEventPayload`, `replayRun`, `getEvent`, `countEvents`, `verifyHashChain` — event repository (`src/repositories/events.ts`)
- `events`, `EventRow`, `InsertEvent` — Drizzle schema (`src/schema.ts`)
- `projections/index.ts` — read-model projections (separate from event repository)
- Drizzle migrations: `packages/db/drizzle/` (generated SQL + snapshots)
- `drizzle.config.ts` — Drizzle Kit configuration

### `packages/broker-paper` — `@arena/broker-paper`

**Role:** Simulated paper trading — fills, fees, slippage, positions, P&L, and the risk gate.

**Key exports:**
- `PaperBroker` — main broker class (`src/broker.ts`)
- `PaperRiskGate` — deterministic risk evaluator (`src/risk-gate.ts`)
- `TakerMakerFeeModel`, `DEFAULT_FEE_CONFIG` — fee model (`src/fee-model.ts`)
- `SpreadSlippageModel` — slippage model (`src/slippage-model.ts`)
- `CashLedger` — cash balance tracking (`src/ledger.ts`)
- `PositionTracker` — position state (`src/positions.ts`)
- `PnLTracker` — realized/unrealized P&L (`src/pnl.ts`)
- `computeMarketFill`, `computeLimitFill` — fill logic (`src/fills.ts`)
- `MoneyDecimal`, `ZERO_MONEY` — local money module (`src/money/decimal.ts`)
- Types: `PlaceOrderRequest`, `BrokerEventPayload`, `MarketTick`, `BrokerEventHandler` (`src/types.ts`)

### `packages/feeds` — `@arena/feeds`

**Role:** Public market data ingestion. No API credentials. WebSocket adapters with Bottleneck rate limiting.

**Key exports:**
- `CoinbaseFeedAdapter` — Coinbase WebSocket client (`src/clients/coinbase.ts`)
- `BinanceFeedAdapter` — Binance WebSocket client (`src/clients/binance.ts`)
- `normalizeCoinbaseTick`, `normalizeBinanceTick` — Zod normalizers (`src/normalizers/`)
- `getFeedRateLimiter` — Bottleneck limiter factory (`src/limiters.ts`)
- `feedLogger` — shared Pino child logger (`src/logger.ts`)

### `packages/strategies` — `@arena/strategies`

**Role:** Strategy manifest validation, loader, registry, signal execution. Strategies emit signals only.

**Key exports:**
- `StrategyRegistry` — registry of loaded strategies (`src/registry.ts`)
- `StrategyLoader` — manifest file loader (`src/loader.ts`)
- `StrategyExecutor` — runs a strategy against market context (`src/executor.ts`)
- `validateManifest` — manifest Zod validation (`src/manifest.ts`)
- `defaultRegistry` — pre-loaded built-in strategies (`src/default-registry.ts`)
- `StrategySignalEvent` — signal event type (`src/signal-events.ts`)
- Built-ins: `do-nothing-baseline`, `momentum-basic`, `mean-reversion-basic`, `orderbook-imbalance`, `volatility-breakout` (`src/built-ins/`)
- Technical indicators: `src/indicators.ts`

### `packages/agents` — `@arena/agents`

**Role:** Paper agent interface and deterministic demo agents. LLM/OpenRouter integration is planned.

**Key exports:**
- `PaperAgent` interface — `{ agentId, name, decide(observation): AgentDecision }`
- `createDeterministicPaperAgent(config)` — rule-based agent factory
- `createDemoPaperAgents()` — creates `agent-momentum` + `agent-cash-preserver`
- `DeterministicAgentConfig` type

### `packages/telemetry` — `@arena/telemetry`

**Role:** Pino and OpenTelemetry exports (stub — exports not yet implemented).

### `packages/ui` — `@arena/ui`

**Role:** Shared React component library (stub — not yet implemented).

## Key Source Paths

| Purpose | Path |
|---------|------|
| API server entry | `apps/api/src/index.ts` |
| Worker entry | `apps/worker/src/index.ts` |
| Demo runner | `apps/worker/src/demo.ts` |
| Replay utility | `apps/worker/src/replay.ts` |
| Event store repository | `packages/db/src/repositories/events.ts` |
| SQLite schema | `packages/db/src/schema.ts` |
| DB client factory | `packages/db/src/client.ts` |
| Drizzle migrations | `packages/db/drizzle/` |
| Risk gate | `packages/broker-paper/src/risk-gate.ts` |
| Paper broker | `packages/broker-paper/src/broker.ts` |
| Money/Decimal config | `packages/broker-paper/src/money/decimal.ts` |
| All domain Zod schemas | `packages/core/src/schemas/` |
| SimEvent types (20 types) | `packages/core/src/events/types.ts` |
| Event bus | `packages/core/src/events/bus.ts` |
| MarketFeedAdapter interface | `packages/core/src/interfaces.ts` |
| Core constants | `packages/core/src/constants.ts` |
| Coinbase feed adapter | `packages/feeds/src/clients/coinbase.ts` |
| Binance feed adapter | `packages/feeds/src/clients/binance.ts` |
| Feed rate limiters | `packages/feeds/src/limiters.ts` |
| Strategy registry | `packages/strategies/src/registry.ts` |
| Strategy executor | `packages/strategies/src/executor.ts` |
| Strategy loader | `packages/strategies/src/loader.ts` |
| Built-in strategies | `packages/strategies/src/built-ins/` |
| Demo paper agents | `packages/agents/src/index.ts` |

## Naming Conventions

**Files:**
- kebab-case for all source files: `risk-gate.ts`, `fee-model.ts`, `slippage-model.ts`
- Test files co-located under `src/__tests__/`: `broker.test.ts`, `fills.test.ts`
- Normalizers named after provider: `coinbase.ts`, `binance.ts`
- Built-in strategies named by strategy type: `momentum-basic.ts`, `mean-reversion-basic.ts`

**Directories:**
- `src/__tests__/` for all test files within a package
- `src/schemas/` for Zod schema modules within `packages/core`
- `src/clients/` for WebSocket/HTTP client implementations within `packages/feeds`
- `src/normalizers/` for Zod normalization functions within `packages/feeds`
- `src/built-ins/` for built-in strategy implementations
- `src/money/` for Decimal.js money module within broker and core packages

**Classes:**
- PascalCase: `PaperBroker`, `PaperRiskGate`, `CashLedger`, `PositionTracker`, `TakerMakerFeeModel`

**Schemas:**
- PascalCase with `Schema` suffix: `AgentDecisionSchema`, `NormalizedMarketEventSchema`, `RiskEventSchema`

**Types inferred from schemas:**
- PascalCase without suffix: `AgentDecision`, `NormalizedMarketEvent`, `RiskEvent`

## Where to Add New Code

**New HTTP route (future Fastify migration):**
- Route handler: `apps/api/src/routes/<context>.ts`
- Zod schemas for request/response: `packages/core/src/schemas/<context>.ts` or inline with `Schema` suffix
- Tests: `apps/api/src/__tests__/<context>.test.ts` using `fastify.inject`

**New domain schema or type:**
- Add to `packages/core/src/schemas/<closest-domain>.ts`
- Export from `packages/core/src/index.ts`

**New SimEvent type:**
- Add enum value to `SimEventTypeSchema` in `packages/core/src/events/types.ts`
- Add typed payload schema in the same file
- Export from `packages/core/src/index.ts`

**New feed adapter:**
- Client: `packages/feeds/src/clients/<provider>.ts` implementing `MarketFeedAdapter`
- Normalizer: `packages/feeds/src/normalizers/<provider>.ts` with Zod schema
- Export from `packages/feeds/src/index.ts`
- Tests: `packages/feeds/src/__tests__/<provider>.test.ts` using fake ws server

**New built-in strategy:**
- Implementation: `packages/strategies/src/built-ins/<name>.ts`
- Register in `packages/strategies/src/default-registry.ts`
- Tests: `packages/strategies/src/__tests__/built-ins.test.ts`

**New user strategy pack:**
- Place under `strategies/<strategy-name>/` (outside `packages/`)
- Must include valid manifest file validated by `StrategyManifestSchema`

**New paper broker module (fees, slippage, etc.):**
- Implementation: `packages/broker-paper/src/<module>.ts`
- Tests: `packages/broker-paper/src/__tests__/<module>.test.ts`
- Use `MoneyDecimal` from `packages/broker-paper/src/money/decimal.ts` for all money values

**Shared test helpers:**
- Place in `tests/` at the repo root for cross-package fixtures
- Package-specific fixtures: `packages/<pkg>/src/__tests__/fixtures.ts`

## Special Directories

**`.claude/`:**
- Purpose: Claude Code framework — rules, skills, agents, hooks, commands, workflows
- `rules/*.md` — path-scoped coding standards loaded per task
- `hooks/` — runtime blocks for high-risk shell commands and insecure edits
- `skills/` — reusable Claude workflows (event-sourced-simulator, agent-decision-safety, feed-adapter-hardening)
- `agents/` — isolated reviewer roles (simulator-safety, dashboard-chart)
- `commands/` — audit and review commands
- `workflows/arena-audit.js` — deterministic structural framework check
- Generated: No | Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents — phase plans, codebase maps, concerns
- `codebase/` — this directory; contains ARCHITECTURE.md, STRUCTURE.md, STACK.md, etc.
- Generated: Yes (by GSD commands) | Committed: Yes

**`packages/db/drizzle/`:**
- Purpose: Generated Drizzle Kit migration SQL files and JSON snapshots
- Generated: Yes (via `pnpm db:migrate`) | Committed: Yes

**`strategies/`:**
- Purpose: User-authored strategy packs (outside the `packages/` workspace)
- Contains: `examples/`, `test-strategy/`
- Generated: No | Committed: Yes

---

*Structure analysis: 2026-06-01*
