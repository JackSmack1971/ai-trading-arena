# Architecture

**Analysis Date:** 2026-05-31

## Pattern Overview

**Overall:** Event-Sourced Paper-Trading Simulator with Multi-Agent AI Support and a React Dashboard.

**Key Characteristics:**
- **Event-Sourced Core**: All state transitions (market ticks, order placements, fills, risk decisions, strategy signals) are stored as immutable, append-only events.
- **Strict Money Math**: Zero floating-point drift. All financial calculations use `decimal.js` with standard financial rounding rules (`ROUND_HALF_UP`).
- **Deterministic Risk Gate**: A non-AI risk engine acts as the final gate validating all agent and strategy decisions before execution.
- **Monorepo Workspace**: Code split into thin application shells (`apps/*`) wrapping modular domain packages (`packages/*`).

## Layers

**Simulator Runtime (Worker Shell):**
- Purpose: Orchestrates the main simulation loop and handles historical replays.
- Contains: Live run loops, replay drivers.
- Location: `apps/worker/src/`
- Depends on: `packages/core`, `packages/db`, `packages/feeds`, `packages/agents`, `packages/strategies`, `packages/broker-paper`, `packages/telemetry`.

**Interface Layer (API & Web Shells):**
- Purpose: Exposes real-time simulation updates and renders the visualization dashboard.
- Contains: Fastify HTTP and WebSocket servers (`apps/api`), Vite-React SPA dashboard (`apps/web`).
- Location: `apps/api/src/`, `apps/web/src/`
- Depends on: `packages/core`, `packages/db`, `packages/telemetry`.

**Domain Logic Packages (Core & Infrastructure):**
- **Core Domain**: Defines schemas, event types, money helpers, and configuration rules.
  - Location: `packages/core/src/`
- **Simulation Execution**: Matches order sheets, calculates fee models, tracks cash balances/reserves.
  - Location: `packages/broker-paper/src/`
- **Database Engine**: Manages event insertion and replaying from the SQLite event log.
  - Location: `packages/db/src/`
- **Market Ingestion**: Connects to public market endpoints.
  - Location: `packages/feeds/src/`
- **Strategy & Agent Services**: Handles strategy loaders and LLM client requests.
  - Location: `packages/strategies/src/`, `packages/agents/src/`

## Data Flow

**Simulation Tick Life-Cycle:**

1. **Market Tick**: A new price tick arrives from the feed adapter (`packages/feeds`).
2. **Event Emitted**: Simulation loop appends `MARKET_TICK_RECEIVED` to the database event store.
3. **Strategy Processing**: The strategy engine (`packages/strategies`) processes the tick. If signals emerge, it emits a `STRATEGY_SIGNAL_EMITTED` event.
4. **Agent Decision**: The simulation worker requests a trade decision from the corresponding AI agent (`packages/agents`). The agent records its logic and thesis, yielding `AGENT_DECISION_RECEIVED`.
5. **Risk Gate**: The decision undergoes deterministic checks inside the risk gate (`packages/core/src/schemas/risk.ts`).
6. **Broker Match**: Approved orders go to the paper broker (`packages/broker-paper`). Fills are recorded, emitting `PAPER_ORDER_FILLED` and updating the Cash Ledger.
7. **UI Update**: The database repository persists events, triggering server updates via Fastify WebSocket to the React dashboard.

**State Management:**
- Reconstructed dynamically: Read models (projections) read forward from sequence `0` of the SQLite database.
- State mutation is forbidden; new states are represented as new events.

## Key Abstractions

**SimEvent:**
- Purpose: Represents any state change in the simulation run.
- Examples: `MarketTickPayload`, `PaperOrderPayload`, `PaperFillPayload`.
- Pattern: Immutable Event Objects typed using Zod.

**CashLedger:**
- Purpose: In-memory cash balance tracker representing absolute, reserved, and available funds.
- Location: `packages/broker-paper/src/ledger.ts`
- Pattern: Append-only transaction collection.

**PaperBroker:**
- Purpose: Simulates order fills, slippage, and portfolio P&L adjustments.
- Location: `packages/broker-paper/src/broker.ts`

**MoneyDecimal:**
- Purpose: Immutable currency wrapper to enforce standard precision and scales.
- Location: `packages/core/src/money/decimal.ts`

## Entry Points

**Simulation Core Loop:**
- Location: `apps/worker/src/index.ts`
- Triggers: Main runner initialization.

**Replay Engine:**
- Location: `apps/worker/src/replay.ts`
- Triggers: Replay CLI command (`pnpm sim:replay`).

**API Server:**
- Location: `apps/api/src/index.ts`
- Triggers: Server startup (`pnpm dev:api`).

## Error Handling

**Strategy:**
- Core processes throw explicit exceptions.
- The simulator run loop catches errors at the step boundary, records the error via event logging, and gracefully halts or skips the frame rather than crashing the database connection.

## Cross-Cutting Concerns

**Validation:**
- Zod schemas in `packages/core/src/schemas/` validate all boundary inputs.

**Money Math:**
- All money conversions utilize `MoneyDecimal` from `@arena/core` to prevent float errors.

**Logging:**
- Pino logs are output through `packages/telemetry`.

---

*Architecture analysis: 2026-05-31*
*Update when major patterns change*
