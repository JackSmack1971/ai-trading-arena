# Codebase Structure

**Analysis Date:** 2026-05-31

## Directory Layout

```
ai-trading-arena/
├── apps/                 # Application entrance points and execution shells
│   ├── api/             # Fastify local API and WebSocket server
│   ├── web/             # Vite + React dashboard interface
│   └── worker/          # Core simulation runtime and replay engine
├── packages/             # Shared monorepo packages
│   ├── agents/          # OpenRouter integration and agent LLM deciders
│   ├── broker-paper/    # Fills matching, positions, and ledger engines
│   ├── core/            # Zod schemas, domain events, constants, and money math
│   ├── db/              # SQLite database and Drizzle ORM persistence
│   ├── feeds/           # Market data adapters (Coinbase, Binance, etc.)
│   ├── strategies/      # Strategy indicators, manifests, and registration
│   ├── telemetry/       # Pino logging and OpenTelemetry integrations
│   └── ui/              # Reusable React components for apps/web
├── docs/                 # Blueprint and map documentation
├── scripts/              # Command-line tools (e.g., scaffolding strategies)
├── tsconfig.json         # Workspace TypeScript compiler configurations
├── package.json          # Root workspace scripts and devDependencies
└── pnpm-workspace.yaml   # Workspace routing boundaries
```

## Directory Purposes

**apps/api:**
- Purpose: Web server hosting API endpoints and real-time updates via WebSockets.
- Contains: Fastify routing logic, WebSocket channels.
- Key files: `src/index.ts` - Entry point.

**apps/web:**
- Purpose: Interactive React dashboard UI.
- Contains: React views, charts, and control forms.
- Key files: `src/index.ts` - Entry point.

**apps/worker:**
- Purpose: Core simulation engine that drives pricing tick loops and feeds them into loaded strategies.
- Contains: Main running loops, historical replay handlers.
- Key files: `src/index.ts` - Live simulator. `src/replay.ts` - Replay system.

**packages/core:**
- Purpose: Base types, constants, schemas, and absolute money rules.
- Contains: Zod validators (`src/schemas/`), event payloads (`src/events/`), money logic (`src/money/`).
- Key files: `src/money/decimal.ts` - Precise arithmetic using Decimal.js.

**packages/broker-paper:**
- Purpose: Matches buy/sell signals, simulates fees/slippage, runs cash ledger.
- Contains: Position matching engines, portfolio calculators, and CashLedgers.
- Key files: `src/broker.ts` - Order matcher. `src/ledger.ts` - Reserved balance tracker.

**packages/db:**
- Purpose: SQLite connection manager and append-only event persistency layer.
- Contains: Schema schemas, query builders, repository patterns.
- Key files: `src/schema.ts` - Drizzle mapping for `events` table. `src/client.ts` - WAL configuration.

## Key File Locations

**Entry Points:**
- `apps/worker/src/index.ts` - Live simulation runner.
- `apps/worker/src/replay.ts` - Historical simulation replayer.
- `apps/api/src/index.ts` - API and WebSocket server.

**Configuration:**
- `package.json` - Workspace definition and command paths.
- `pnpm-workspace.yaml` - Monorepo package matching pattern.
- `packages/db/drizzle.config.ts` - DB migration schema source.
- `.env.example` - Template for local configurations.

**Core Logic:**
- `packages/core/src/money/decimal.ts` - Shared `MoneyDecimal` engine.
- `packages/broker-paper/src/broker.ts` - Matching fill simulator.
- `packages/db/src/schema.ts` - Event store database schema.

**Testing:**
- `packages/core/src/__tests__/domain.test.ts` - Domain rules validation.
- `packages/broker-paper/src/__tests__/` - Paper broker filling and ledger tests.
- `packages/strategies/src/__tests__/` - Built-in indicator tests.
- `packages/db/src/__tests__/` - DB event persistence tests.

## Naming Conventions

**Files:**
- `kebab-case.ts` - All TS files (e.g. `fee-model.ts`, `default-registry.ts`).
- `*.test.ts` - Test files located inside sibling `__tests__/` directories.
- `index.ts` - Barrel file for directory exports.

**Directories:**
- `kebab-case` - All package and application subfolders.
- `__tests__` - Testing directories under package scopes.

## Where to Add New Code

**New Strategy Indicator:**
- Primary code: `packages/strategies/src/built-ins/` or `packages/strategies/src/indicators.ts`
- Tests: `packages/strategies/src/__tests__/`

**New Event Type:**
- Definition: Add schema inside `packages/core/src/events/types.ts`
- Export: Re-export from `packages/core/src/index.ts`

**New DB Read Projection:**
- Definition: `packages/db/src/projections/`
- Register: Export from `packages/db/src/index.ts`

---

*Structure analysis: 2026-05-31*
*Update when directory structure changes*
