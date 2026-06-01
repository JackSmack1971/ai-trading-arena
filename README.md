# AI Trading Arena

A **local-first AI paper-trading simulator** where two AI agents compete over the same live market feed. No real money, no broker connections, no wallet signing — simulated fills and P&L only.

> This repository contains the monorepo scaffold, framework rules, and strategy SDK. Application source code (Fastify API, React dashboard, simulation worker) lives in the `apps/` and `packages/` directories and is built out incrementally.

---

## Contents

- [What this is](#what-this-is)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Monorepo layout](#monorepo-layout)
- [Scripts reference](#scripts-reference)
- [Writing a strategy](#writing-a-strategy)
- [Security constraints](#security-constraints)
- [Verification](#verification)
- [Key docs](#key-docs)
- [Claude Code framework](#claude-code-framework)

---

## What this is

AI Trading Arena is a **paper-trading research lab**, not a live-trading bot.

Each agent gets its own OpenRouter model, system prompt, paper balance, and strategy modules. A deterministic simulator core processes market ticks; AI agents intervene on triggers (drawdown breach, regime change, breakout) rather than on every tick. This keeps costs low, respects free-model rate limits, and makes every simulation replayable.

**What it supports (when fully implemented):**
- Live public market-data feed ingestion (Coinbase, Binance, Kraken, Polymarket, DexScreener — all public/no-auth)
- Historical simulation replay
- Agent-vs-agent competitions with per-agent telemetry
- Strategy hot-loading via the strategy SDK
- React dashboard with Lightweight Charts and Recharts visualizations
- Exportable research logs (append-only event records)

**What it explicitly does not do:**
- Real broker integration
- Private-key or wallet signing
- Exchange account connections
- Actual order placement of any kind

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20.0.0 |
| pnpm | ≥ 9.0.0 (project uses `pnpm@9.15.9`) |

---

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy the environment template
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY to your OpenRouter key

# 3. Run the structural audit to verify the framework is intact
node .claude/workflows/arena-audit.js

# 4. Start all apps in parallel (API + web dashboard + worker)
pnpm dev
```

To start only one app:

```bash
pnpm dev:api     # Fastify HTTP/WebSocket API
pnpm dev:web     # React/Vite dashboard
pnpm dev:worker  # Simulation engine
```

---

## Monorepo layout

```
trader-arena/
├── apps/
│   ├── api/        # @arena/api    — Fastify HTTP + WebSocket server
│   ├── web/        # @arena/web    — React/Vite dashboard
│   └── worker/     # @arena/worker — Long-running simulation engine
├── packages/
│   ├── core/           # @arena/core          — Domain events, simulator primitives, Zod contracts
│   ├── broker-paper/   # @arena/broker-paper  — Simulated fills, fees, slippage, positions, P&L
│   ├── feeds/          # @arena/feeds         — Public market-data adapters (ws + undici)
│   ├── agents/         # @arena/agents        — OpenRouter clients, prompts, decision schemas
│   ├── strategies/     # @arena/strategies    — Strategy manifest loader, signal runtime
│   ├── telemetry/      # @arena/telemetry     — Pino logging, OpenTelemetry naming, exporters
│   ├── db/             # @arena/db            — Drizzle + better-sqlite3 schema and migrations
│   └── ui/             # @arena/ui            — Shared React components
├── strategies/
│   └── test-strategy/  # Example signal-only strategy pack
├── scripts/
│   └── create-strategy.ts  # Strategy scaffold generator
└── docs/
    ├── AI_TRADING_ARENA_BLUEPRINT.md
    ├── PRACTICAL_LIBRARY_MAP.md
    └── FRAMEWORK_TRACEABILITY.md
```

---

## Scripts reference

Run from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Start API, web, and worker in parallel |
| `pnpm dev:api` | Start only the Fastify API |
| `pnpm dev:web` | Start only the Vite dashboard |
| `pnpm dev:worker` | Start only the simulation worker |
| `pnpm build` | Build all workspace packages |
| `pnpm typecheck` | TypeScript typecheck across the monorepo |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm test` | Vitest across all packages |
| `pnpm db:migrate` | Run Drizzle migrations (`@arena/db`) |
| `pnpm strategy:create` | Scaffold a new strategy pack (see below) |
| `pnpm sim:replay` | Replay a simulation run from the event log |
| `node .claude/workflows/arena-audit.js` | Structural framework audit |

---

## Writing a strategy

Strategies are **signal-only plugins** — they analyze market state and emit typed signals. They cannot emit orders directly, access the network, or read the filesystem. Agents convert signals into trade intents through the risk gate.

### Scaffold a new strategy

```bash
pnpm strategy:create --id my-strategy --name "My Strategy" --description "What it does"
```

This creates `strategies/my-strategy/` containing:

```
strategies/my-strategy/
├── manifest.yaml   # Zod-validated permissions manifest
├── strategy.ts     # TypeScript implementation
├── README.md       # Documentation template
└── tests/          # Vitest tests go here
```

### Manifest format

```yaml
id: my-strategy
name: "My Strategy"
version: 0.1.0
entry: strategy.ts
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
```

All four permission fields are required. `network`, `filesystem`, and `can_emit_orders` must be `false` for strategies in this repository.

### Implementation shape

```typescript
import type {
  NormalizedMarketEvent,
  Strategy,
  StrategyContext,
  StrategySignal,
} from '../../packages/strategies/src/types.js';

export const MyStrategy: Strategy = {
  id: 'my-strategy',
  name: 'My Strategy',
  version: '0.1.0',

  onStart(_ctx: StrategyContext): void {
    // Set up state once on activation.
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    // Return typed signals or [] for NOOP.
    return [];
  },
};

export default MyStrategy;
```

---

## Security constraints

These are hard invariants enforced by the framework hooks and rules.

- **No live execution** — no real broker, exchange, wallet-signing, or fund-moving adapters, ever.
- **Schema-validated decisions** — every agent output is parsed through a shared Zod schema before it reaches the risk gate or paper broker. Invalid or unrepaired output becomes `NOOP` plus a structured audit event.
- **Risk gate is final** — position size, exposure, drawdown, order frequency, and strategy-switch limits are enforced deterministically before any paper-broker mutation. Risk rejections are terminal and logged with the rejected payload and rule ID.
- **Append-only events** — simulator state transitions are recorded in append-only event rows. Historical event records are never mutated.
- **Secrets stay server-side** — `OPENROUTER_API_KEY` and other credentials live in environment variables only. They are never echoed to logs, traces, test fixtures, or the browser.

Runtime hooks in `.claude/hooks/pre-tool-use.js` and `.claude/hooks/post-tool-use.js` block high-risk shell commands and insecure secret-handling edits automatically.

---

## Verification

After any structural change to the framework, run:

```bash
node .claude/workflows/arena-audit.js
```

This checks that all required files, directories, and Claude surfaces are present and correctly named. Any missing file or naming violation is reported as a framework defect.

For code changes (once packages have source):

```bash
pnpm typecheck   # TypeScript project references across the monorepo
pnpm test        # Vitest unit and integration tests
```

---

## Key docs

| File | Purpose |
|---|---|
| [`docs/AI_TRADING_ARENA_BLUEPRINT.md`](docs/AI_TRADING_ARENA_BLUEPRINT.md) | Product definition, architecture decisions, recommended stack |
| [`docs/PRACTICAL_LIBRARY_MAP.md`](docs/PRACTICAL_LIBRARY_MAP.md) | Dependency selections and rationale per package |
| [`docs/FRAMEWORK_TRACEABILITY.md`](docs/FRAMEWORK_TRACEABILITY.md) | Blueprint-to-rule coverage map |
| [`CLAUDE.md`](CLAUDE.md) | Compact project entrypoint for Claude Code agents |
| [`AGENTS.md`](AGENTS.md) | Working invariants and architecture guardrails for coding agents |

---

## Claude Code framework

This repository is designed to be developed with [Claude Code](https://claude.ai/code). The `.claude/` directory contains the full agent framework:

| Path | Purpose |
|---|---|
| `.claude/settings.json` | Shared permissions, confirmation gates, and hooks configuration |
| `.claude/rules/` | Path-scoped coding rules (Zod, Decimal.js, Fastify, feeds, testing, etc.) |
| `.claude/rules/rule-catalog.md` | Rule taxonomy — start here to find the right rule set |
| `.claude/hooks/` | Runtime blocks for high-risk shell commands and secret-handling edits |
| `.claude/commands/` | Reusable audit and review slash commands |
| `.claude/skills/` | High-context repeatable workflows |
| `.claude/agents/` | Isolated reviewer personas (simulator safety, dashboard/chart audit) |
| `.claude/output-styles/` | Specialized review output formats |
| `.claude/workflows/arena-audit.js` | Deterministic structural framework checker |
| `.claude/security-rules.md` | Simulator boundary and secret-handling rules |
| `.claude/claude-security-guidance.md` | Scanner-backed security review criteria |
