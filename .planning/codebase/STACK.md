# Technology Stack

**Analysis Date:** 2026-05-31

## Languages

**Primary:**
- TypeScript 5.4.0 - All application code

**Secondary:**
- JavaScript (ES Modules) - Build scripts, ESLint configuration (`eslint.config.js`), and formatting configs

## Runtime

**Environment:**
- Node.js >= 20.0.0 (LTS)
- Browser runtime (Vite/React dev environment for `apps/web`)

**Package Manager:**
- pnpm 9.15.9 (configured via workspace)
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- React (planned for `apps/web`)
- Vite (planned for bundling `apps/web`)
- Fastify (planned for `apps/api`)

**Testing:**
- Vitest 1.6.0 - Test runner for all packages/apps
- `@vitest/coverage-v8` 1.6.0 - Code coverage

**Build/Dev:**
- tsup 8.0.0 - Bundling for packages and backend entry points
- tsx 4.0.0 - Dynamic execution of TypeScript scripts (e.g. `scripts/create-strategy.ts`)
- TypeScript compiler (`tsc`)

## Key Dependencies

**Critical:**
- `decimal.js` 10.6.0 - High-precision arithmetic for all money, prices, order quantities, and P&L calculations (no float/double issues)
- `zod` 4.4.3 - Runtime schema validation at boundary layers (APIs, events, DB)
- `drizzle-orm` 0.40.0 - Lightweight ORM for event-sourced SQLite DB
- `better-sqlite3` 9.4.3 - Native SQLite client for persistence

**Infrastructure:**
- `eventemitter3` 5.0.4 - High-performance event emitter used in simulator primitives
- `date-fns` 4.4.0 - Datetime parsing and formatting
- `ts-pattern` 5.9.0 - Typesafe pattern matching for simulator events
- `nanoid` 5.1.11 - High-performance secure unique ID generator

## Configuration

**Environment:**
- Configuration via environment variables loaded from `.env` files (template provided in `.env.example`).
- Keys: `OPENROUTER_API_KEY`, `API_PORT`, `API_HOST`, `DB_FILE_NAME`, `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `LOG_LEVEL`.

**Build:**
- `pnpm-workspace.yaml` - Multi-package workspace definition
- `tsconfig.json` & `tsconfig.base.json` - Compiler configuration
- `eslint.config.js` - Coding standard rules
- `prettier.config.js` - Auto-formatting config

## Platform Requirements

**Development:**
- Cross-platform: macOS, Linux, or Windows (any system with Node.js >= 20 and pnpm >= 9)

**Production:**
- Distributed as a local-first simulation environment
- Local filesystem required for SQLite event store (`arena.db`)

---

*Stack analysis: 2026-05-31*
*Update after major dependency changes*
