# AI Trading Arena: Project Context & Guidelines

This document serves as the foundational instructional context for Gemini CLI interactions in this workspace. It summarizes the architecture, technology stack, and non-negotiable conventions for the **AI Trading Arena** framework.

## Project Overview

**AI Trading Arena** is a local-first AI paper-trading simulator framework. It provides a research lab where multiple AI agents can compete over live market feeds in a safe, simulated environment.

### Core Architecture
The project is a **TypeScript monorepo** using **pnpm workspaces**, designed with an **event-sourced core**.

*   **apps/web:** React dashboard (Vite, Tailwind CSS) for real-time visualization.
*   **apps/api:** Fastify local API and WebSocket server for dashboard updates.
*   **apps/worker:** Simulation runtime engine.
*   **packages/core:** Domain types, event models, and simulator primitives.
*   **packages/broker-paper:** Simulated order matching, fills, slippage, and P&L accounting.
*   **packages/db:** SQLite persistence using Drizzle ORM (append-only event store).
*   **packages/feeds:** Public market data adapters (Coinbase, Binance, Kraken, etc.).
*   **packages/agents:** OpenRouter integration for AI agent decision-making.
*   **packages/strategies:** Strategy SDK and runtime loaders.
*   **packages/telemetry:** Pino logging, OpenTelemetry naming, and research exports.

### Key Principles
1.  **NO LIVE TRADING:** No execution adapters, wallet signing, or real fund movement.
2.  **Event-Sourced:** Every state change (tick, order, fill, decision) is an immutable event.
3.  **Replayable:** Simulations can be exactly reconstructed from the event log.
4.  **Risk Gate Authority:** A non-AI risk engine is the final authority for all simulated actions.
5.  **Telemetry-Rich:** Every agent decision includes a visible "trade thesis" and full telemetry.

---

## Building and Running

### Prerequisites
*   **Node.js:** >= 20.0.0
*   **pnpm:** >= 9.0.0

### Key Commands
*   `pnpm install`: Install dependencies.
*   `pnpm dev`: Run all applications in parallel (Web, API, Worker).
*   `pnpm test`: Run tests across all packages/apps.
*   `pnpm lint`: Run ESLint across the workspace.
*   `pnpm typecheck`: Run TypeScript compiler checks.
*   `pnpm db:migrate`: Run Drizzle migrations for the SQLite database.
*   `pnpm strategy:create`: Scaffold a new strategy using `scripts/create-strategy.ts`.
*   `pnpm sim:replay`: Replay a simulation run (worker).

---

## Development Conventions

### General Principles
*   **Surgical Changes:** Modify only what is necessary. Adhere to existing patterns.
*   **Shell Commands (Windows):** When using the Bash tool on Windows, prefer POSIX-compatible commands (e.g., `find`, `ls`, `grep`, `cat`). Avoid CMD-specific syntax like `dir /s /b`. If a specific Windows command is needed, use `powershell.exe -NoProfile -Command "..."`.
*   **Type Safety:** Use TypeScript strictly. No `any`. Use **Zod** for all boundary validation (API, DB, Events).
*   **Money Math:** ALWAYS use **Decimal.js** for prices, quantities, fees, and P&L. Never use floating-point numbers for money.
*   **Event Naming:** Follow OpenTelemetry-style naming (e.g., `MARKET_TICK_RECEIVED`, `PAPER_ORDER_FILLED`).

### Coding Standards
*   **Standard Tooling:** ESLint for linting, Prettier for formatting, Vitest for unit/integration tests, Playwright for E2E.
*   **Shared Packages:** Keep domain logic, Zod schemas, and helpers in `@arena/core` or relevant packages to avoid duplication.
*   **Thin Edges:** Keep `apps/api` and `apps/worker` thin; move logic into packages.

### Safety & Invariants
*   **No Execution Adapters:** Never implement real brokerage or wallet integrations.
*   **Risk Gate:** Agent decisions MUST be validated against schemas and passed through the risk gate before reaching the paper broker.
*   **Secrets:** Store OpenRouter keys in `.env` or local secret storage. Never log or commit secrets.
*   **Deterministic Simulation:** Ensure the simulator core remains deterministic for replayability. Use mock feeds and stable timestamps in tests.

### Testing Strategy
*   **Empirical Reproduction:** For bug fixes, write a failing test first.
*   **Harnesses:** Use the strategy and agent test harnesses provided in the framework.
*   **Replay Validation:** Verify that replayed simulations yield identical results to the original run.

---

## Key Files for Reference
*   `CLAUDE.md`: Quick entrypoint for AI assistants.
*   `AGENTS.md`: Detailed invariants and working rules for agents.
*   `docs/AI_TRADING_ARENA_BLUEPRINT.md`: Full architectural and product roadmap.
*   `docs/PRACTICAL_LIBRARY_MAP.md`: Detailed stack and dependency guidance.
*   `.claude/rules/`: Path-scoped guidance (Zod, Fastify, Drizzle, etc.).
