# Technology Stack

**Analysis Date:** 2026-06-01

## Languages & Runtime

**Primary:**
- TypeScript 5.4+ — all packages and apps; strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `isolatedModules`
- JavaScript (ESM) — `"type": "module"` in every `package.json`; `"target": "ES2022"`, `"lib": ["ES2022"]`

**TypeScript Config Highlights (`tsconfig.base.json`):**
- `moduleDetection: "force"`, `isolatedModules: true`
- `declaration: true`, `declarationMap: true`, `sourceMap: true`
- Backend packages: `module: "NodeNext"` / `moduleResolution: "NodeNext"` (tsup ESM output)
- Frontend (`@arena/web`): `module: "ESNext"` / `moduleResolution: "Bundler"` (Vite-bundled)
- Root `tsconfig.json` uses project `references` for all 11 workspace packages

**Runtime:**
- Node.js >= 20.0.0 (enforced via `engines` in root `package.json`)
- Browser (Vite/React for `apps/web`)

## Core Frameworks

**API Server (`apps/api`):**
- Raw Node.js `http.createServer` + `ws` ^8.18.0 WebSocket server (current implementation; Fastify is the target pattern per rules but not yet wired)
- `pino` ^9.5.0 — structured logging with child loggers

**Frontend (`apps/web`):**
- Vite — dev + build (`vite dev`, `vite build`)
- React — referenced in rules and UI package; `apps/web/src/index.ts` is minimal stub
- Tailwind CSS — referenced in rules; not confirmed in `package.json` yet

**Worker (`apps/worker`):**
- Node.js process; `tsx watch` for dev, `tsup` for production build
- Replay entrypoint: `src/replay.ts`

**Domain Packages:**

| Package | Role |
|---------|------|
| `@arena/core` | Shared Zod schemas, Decimal.js money types, event/feed primitives, domain contracts |
| `@arena/db` | Drizzle + better-sqlite3 client, schema, repositories, event projections |
| `@arena/agents` | Paper agent interface + deterministic demo agents |
| `@arena/broker-paper` | Paper broker, order/fill simulation, market tick handling |
| `@arena/feeds` | Public feed adapters (Coinbase, Binance), Bottleneck rate limiters, normalizers |
| `@arena/strategies` | Strategy manifests, signal-generation DSL |
| `@arena/telemetry` | OpenTelemetry wiring (stub — `src/index.ts` exports nothing yet) |
| `@arena/ui` | Shared React UI component library (stub) |

## Build & Tooling

**Bundler/Transpiler:**
- `tsup` ^8.0.0 — ESM output (`--format esm --dts`) for all backend and shared packages
- `tsx` ^4.0.0 — dev server runner (`tsx watch src/index.ts`) and script runner (`scripts/create-strategy.ts`)

**Test Runner:**
- `vitest` ^1.6.0 — all packages; `vitest run --passWithNoTests` default
- `@vitest/coverage-v8` ^1.6.0 — V8 coverage
- `@vitest/ui` ^1.6.0 — UI mode

**Linter/Formatter:**
- `eslint` ^9.0.0 with `typescript-eslint` ^8.0.0 and `@eslint/js` ^9.0.0
- `prettier` ^3.0.0
- `vite-tsconfig-paths` ^4.3.0 — path alias resolution for Vite

**Dead-code Detection:**
- `knip` ^5.0.0

**Database Migration:**
- `drizzle-kit` ^0.28.0 — `generate` and `migrate` commands in `@arena/db`

**Key Root Scripts:**
```bash
pnpm dev           # pnpm -r --parallel dev
pnpm typecheck     # pnpm -r typecheck
pnpm test          # pnpm -r test
pnpm db:migrate    # drizzle-kit migrate via @arena/db
pnpm sim:replay    # tsx src/replay.ts via @arena/worker
pnpm strategy:create  # tsx scripts/create-strategy.ts
```

## Package Management

**Manager:** pnpm 9.15.9 (pinned via `packageManager` field)
**Lockfile:** `pnpm-lock.yaml` present
**Workspace shape (`pnpm-workspace.yaml`):**
```
apps/*     → api, web, worker
packages/* → agents, broker-paper, core, db, feeds, strategies, telemetry, ui
```
**Internal dependency protocol:** `workspace:*` or `workspace:^` throughout
**Build lifecycle policy:**
- `onlyBuiltDependencies: [better-sqlite3, esbuild]`
- `ignoredBuiltDependencies: [fsevents]`

## Database & Storage

**Engine:** SQLite (local file, single-process write ownership)
**Driver:** `better-sqlite3` ^11.3.0 — synchronous Node.js SQLite driver
**ORM:** `drizzle-orm` ^0.40.0 with `drizzle-orm/better-sqlite3` adapter
**Migration tool:** `drizzle-kit` ^0.28.0 (generates SQL + snapshot JSON under `drizzle/`)
**Schema location:** `packages/db/src/schema.ts`
**Client factory:** `packages/db/src/client.ts` — `createDb(filePath)` and `createMemoryDb()`

**Runtime PRAGMAs applied on every non-readonly connection:**
- `journal_mode = WAL`
- `wal_autocheckpoint = 1000`
- `foreign_keys = ON`

**Money/P&L storage:**
- `decimal.js` ^10.6.0 — `MoneyDecimal` configured with precision 28, ROUND_HALF_UP
- Module: `packages/core/src/money/decimal.ts`
- Stored as fixed-point decimal strings in SQLite text columns

**Key domain dependencies in `@arena/core`:**
- `zod` ^4.4.3 — all schema validation and TypeScript type derivation
- `decimal.js` ^10.6.0 — money arithmetic
- `date-fns` ^4.4.0 — date/time utilities
- `eventemitter3` ^5.0.4 — typed event emission
- `nanoid` ^5.1.11 — stable ID generation
- `ts-pattern` ^5.9.0 — exhaustive pattern matching on simulator events

## Configuration

**Environment vars (from existing INTEGRATIONS.md and source):**
- `OPENROUTER_API_KEY` — LLM provider key
- `DB_FILE_NAME` — SQLite file path (default: `./data/arena.db`)
- `API_PORT`, `API_HOST` — server binding
- `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` — browser-safe URLs for frontend
- `LOG_LEVEL` — Pino log level

**Config files:**
- `pnpm-workspace.yaml` — workspace membership
- `tsconfig.json` + `tsconfig.base.json` — TypeScript project graph
- `eslint.config.js` — lint rules
- `prettier.config.js` — formatting

## Platform Requirements

**Development:** Cross-platform (macOS, Linux, Windows); Node.js >= 20, pnpm >= 9
**Production:** Local-first; SQLite file on local filesystem; no cloud deployment target defined

---

*Stack analysis: 2026-06-01*
