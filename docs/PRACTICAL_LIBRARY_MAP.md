Below is the practical library map I’d use for the **AI Trading Arena** blueprint. The blueprint calls for a TypeScript monorepo with `apps/web`, `apps/api`, `apps/worker`, and packages for core domain logic, feeds, agents, strategies, telemetry, DB, and paper brokerage.

Vite + React fits the dashboard direction, Fastify fits the local API direction, Drizzle has first-class SQLite support, and OpenTelemetry’s JS stack fits the telemetry direction. ([vitejs](https://vite.dev/guide/?utm_source=chatgpt.com "Getting Started"))

1. Root monorepo + dev tooling

------------------------------

Use these at the repo root.
    pnpm add -D \
      typescript tsx @types/node \
      eslint @eslint/js typescript-eslint \
      prettier \
      vitest @vitest/coverage-v8 @vitest/ui \
      @playwright/test \
      tsup \
      vite-tsconfig-paths \
      knip

Recommended purpose:

| Library                       | Why                                        |
| ----------------------------- | ------------------------------------------ |
| `typescript`                  | Main language                              |
| `tsx`                         | Run TS scripts/workers directly during dev |
| `eslint`, `typescript-eslint` | TypeScript linting                         |
| `prettier`                    | Formatting                                 |
| `vitest`                      | Unit/integration testing                   |
| `@playwright/test`            | Dashboard/onboarding E2E tests             |
| `tsup`                        | Build internal packages                    |
| `knip`                        | Find unused files/dependencies/exports     |

Optional but useful:
    pnpm add -D husky lint-staged commitlint @commitlint/config-conventional

* * *

2. `packages/core` — domain model, event types, simulator primitives

--------------------------------------------------------------------

    pnpm --filter @arena/core add \
      zod \
      decimal.js \
      nanoid \
      date-fns \
      eventemitter3 \
      ts-pattern

Why:

| Library         | Why                                                           |
| --------------- | ------------------------------------------------------------- |
| `zod`           | Runtime validation for events, orders, fills, agent decisions |
| `decimal.js`    | Safer money/P&L math than floating-point numbers              |
| `nanoid`        | Event IDs, run IDs, order IDs                                 |
| `date-fns`      | Time bucketing, bar windows, duration helpers                 |
| `eventemitter3` | Lightweight event bus                                         |
| `ts-pattern`    | Clean exhaustive matching for event reducers                  |

Core should avoid heavy dependencies. This package should be deterministic and boring.

* * *

3. `packages/db` — SQLite, migrations, event store

--------------------------------------------------

The blueprint uses SQLite and an append-only `events` table for replayability and tamper-evident logs.
    pnpm --filter @arena/db add \
      drizzle-orm \
      better-sqlite3

    pnpm --filter @arena/db add -D \
      drizzle-kit \
      @types/better-sqlite3

Why:

| Library                 | Why                      |
| ----------------------- | ------------------------ |
| `drizzle-orm`           | Typed SQL/schema control |
| `drizzle-kit`           | Migrations               |
| `better-sqlite3`        | Fast local SQLite driver |
| `@types/better-sqlite3` | TS types                 |

For secret encryption, prefer built-in Node crypto first:
    node:crypto

Use packages only if needed later:
    pnpm --filter @arena/db add argon2

But for MVP, Node’s `crypto.scrypt`, `createCipheriv`, and `createDecipheriv` are enough.

* * *

4. `apps/api` — local Fastify API + WebSocket server

----------------------------------------------------

    pnpm --filter @arena/api add \
      fastify \
      @fastify/websocket \
      @fastify/cors \
      @fastify/sensible \
      @fastify/env \
      pino \
      zod

Why:

| Library              | Why                         |
| -------------------- | --------------------------- |
| `fastify`            | Local API server            |
| `@fastify/websocket` | Live dashboard updates      |
| `@fastify/cors`      | Local frontend/API dev      |
| `@fastify/sensible`  | HTTP errors/utilities       |
| `@fastify/env`       | Env validation              |
| `pino`               | Structured logging          |
| `zod`                | Request/response validation |

Alternative if you want richer real-time client behavior:
    pnpm --filter @arena/api add socket.io
    pnpm --filter @arena/web add socket.io-client

I’d start with `@fastify/websocket`, then move to Socket.IO only if reconnects, rooms, or event acknowledgements become annoying.

* * *

5. `apps/worker` — simulation runtime

-------------------------------------

    pnpm --filter @arena/worker add \
      pino \
      bottleneck \
      p-retry \
      eventemitter3 \
      zod \
      decimal.js

Why:

| Library         | Why                                 |
| --------------- | ----------------------------------- |
| `bottleneck`    | Provider rate-limit control         |
| `p-retry`       | Controlled retry/backoff            |
| `eventemitter3` | Internal event bus                  |
| `pino`          | Worker logs                         |
| `zod`           | Validate feed/agent/strategy events |
| `decimal.js`    | P&L/accounting safety               |

Avoid Redis queues/BullMQ in MVP. A local-first simulator does not need that complexity yet.

* * *

6. `packages/feeds` — Coinbase, Binance, Kraken, Polymarket, DexScreener adapters

---------------------------------------------------------------------------------

    pnpm --filter @arena/feeds add \
      ws \
      undici \
      bottleneck \
      p-retry \
      zod

Why:

| Library      | Why                                    |
| ------------ | -------------------------------------- |
| `ws`         | Node WebSocket client/server utilities |
| `undici`     | HTTP client for REST feeds             |
| `bottleneck` | Per-provider token buckets             |
| `p-retry`    | Retry with backoff                     |
| `zod`        | Normalize/validate provider payloads   |

I would **not** use `ccxt` in the MVP. It is powerful, but it includes real exchange/trading abstractions you explicitly do not want. Your blueprint is safer with hand-written public-feed adapters only.

* * *

7. `packages/agents` — OpenRouter client, prompts, schemas, parsing

-------------------------------------------------------------------

    pnpm --filter @arena/agents add \
      openai \
      zod \
      zod-to-json-schema \
      jsonrepair \
      p-retry \
      gpt-tokenizer

Why:

| Library              | Why                                                  |
| -------------------- | ---------------------------------------------------- |
| `openai`             | OpenRouter is OpenAI-compatible via custom `baseURL` |
| `zod`                | Agent decision schema                                |
| `zod-to-json-schema` | Convert Zod decisions into JSON Schema               |
| `jsonrepair`         | Last-resort malformed JSON repair                    |
| `p-retry`            | Controlled LLM retry behavior                        |
| `gpt-tokenizer`      | Estimate token usage locally                         |

Agent package should include:
    client.ts
    models.ts
    schemas.ts
    prompts.ts
    decision-request.ts
    decision-parser.ts
    retries.ts
    telemetry.ts

Do **not** add LangChain/LlamaIndex for MVP. You need constrained JSON decisions, not an agent framework.

* * *

8. `packages/strategies` — strategy SDK, YAML DSL, indicators

-------------------------------------------------------------

    pnpm --filter @arena/strategies add \
      zod \
      yaml \
      chokidar \
      technicalindicators \
      simple-statistics \
      decimal.js

Why:

| Library               | Why                                      |
| --------------------- | ---------------------------------------- |
| `yaml`                | Declarative strategy manifests/DSL       |
| `chokidar`            | Hot-load strategy folders in dev         |
| `technicalindicators` | EMA, RSI, ATR, etc.                      |
| `simple-statistics`   | z-score, variance, Sharpe-like helpers   |
| `decimal.js`          | Deterministic numeric/accounting helpers |
| `zod`                 | Validate manifests and emitted signals   |

Built-in strategies from your blueprint map cleanly to these:
    do-nothing-baseline
    momentum-basic
    mean-reversion-basic
    volatility-breakout
    orderbook-imbalance
    spread-capture-paper
    polymarket-midpoint-drift

* * *

9. `packages/broker-paper` — simulated orders, fills, fees, P&L

---------------------------------------------------------------

    pnpm --filter @arena/broker-paper add \
      zod \
      decimal.js \
      nanoid \
      date-fns \
      ts-pattern

Why:

| Library      | Why                             |
| ------------ | ------------------------------- |
| `decimal.js` | Cash, fees, slippage, P&L       |
| `zod`        | Validate orders/fills/positions |
| `nanoid`     | Fill/order IDs                  |
| `date-fns`   | Fill timing/latency simulation  |
| `ts-pattern` | Order state transitions         |

This package should stay deterministic. No network libraries here.

* * *

10. `packages/telemetry` — logs, metrics, exports

-------------------------------------------------

Your blueprint calls for LLM latency, token usage, model errors, schema failures, rate-limit delays, replay exports, CSV, JSONL, and later Parquet.
    pnpm --filter @arena/telemetry add \
      pino \
      @opentelemetry/api \
      @opentelemetry/sdk-node \
      @opentelemetry/resources \
      @opentelemetry/semantic-conventions \
      csv-stringify

Optional later:
    pnpm --filter @arena/telemetry add \
      prom-client \
      parquet-wasm

Why:

| Library                   | Why                                     |
| ------------------------- | --------------------------------------- |
| `pino`                    | Structured local logs                   |
| `@opentelemetry/api`      | Standard telemetry API                  |
| `@opentelemetry/sdk-node` | Node telemetry SDK                      |
| `csv-stringify`           | Trade/decision/telemetry CSV exports    |
| `prom-client`             | Optional Prometheus-style local metrics |
| `parquet-wasm`            | Optional Parquet export later           |

For JSONL, you can write line-delimited JSON manually. No library needed.

* * *

11. `apps/web` — React/Vite dashboard

-------------------------------------

    pnpm --filter @arena/web add \
      react \
      react-dom \
      react-router-dom \
      @tanstack/react-query \
      @tanstack/react-table \
      zustand \
      zod \
      react-hook-form \
      @hookform/resolvers \
      lightweight-charts \
      recharts \
      lucide-react \
      clsx \
      tailwind-merge \
      class-variance-authority \
      sonner
    
    pnpm --filter @arena/web add -D \
      vite \
      @vitejs/plugin-react \
      tailwindcss \
      @tailwindcss/vite \
      typescript

Why:

| Library                                              | Why                                      |
| ---------------------------------------------------- | ---------------------------------------- |
| `react`, `react-dom`                                 | UI                                       |
| `vite`, `@vitejs/plugin-react`                       | Frontend tooling                         |
| `react-router-dom`                                   | App routes/onboarding/dashboard          |
| `@tanstack/react-query`                              | API/server-state cache                   |
| `@tanstack/react-table`                              | Trade tape, events, logs                 |
| `zustand`                                            | Lightweight local UI state               |
| `react-hook-form`, `@hookform/resolvers`, `zod`      | Onboarding forms                         |
| `lightweight-charts`                                 | Candles, price chart, trade markers      |
| `recharts`                                           | Equity curve, drawdown, telemetry charts |
| `lucide-react`                                       | Icons                                    |
| `sonner`                                             | Toasts                                   |
| `tailwindcss`, `@tailwindcss/vite`                   | Styling                                  |
| `clsx`, `tailwind-merge`, `class-variance-authority` | Component styling helpers                |

Optional shadcn-style component dependencies:
    pnpm --filter @arena/web add \
      @radix-ui/react-dialog \
      @radix-ui/react-dropdown-menu \
      @radix-ui/react-tabs \
      @radix-ui/react-tooltip \
      @radix-ui/react-select \
      @radix-ui/react-progress \
      @radix-ui/react-scroll-area

* * *

12. Testing/mocking libraries

-----------------------------

    pnpm add -D \
      msw \
      happy-dom \
      @testing-library/react \
      @testing-library/user-event \
      @testing-library/jest-dom

Use these for:

| Library                       | Why                                       |
| ----------------------------- | ----------------------------------------- |
| `msw`                         | Mock OpenRouter/model-list and REST feeds |
| `happy-dom`                   | Fast component tests                      |
| `@testing-library/react`      | React UI tests                            |
| `@testing-library/user-event` | User interaction tests                    |
| `@testing-library/jest-dom`   | DOM assertions                            |

For WebSocket feed tests, use `ws` directly to spin up mock servers.

* * *

MVP dependency set
==================

For the first complete loop:
    feed → strategy → agent → risk → paper broker → telemetry → dashboard → replay

Install only this first:
    # root
    pnpm add -D typescript tsx @types/node eslint @eslint/js typescript-eslint prettier vitest @vitest/coverage-v8 @playwright/test tsup

    # core/db/broker
    pnpm --filter @arena/core add zod decimal.js nanoid date-fns eventemitter3 ts-pattern
    pnpm --filter @arena/db add drizzle-orm better-sqlite3
    pnpm --filter @arena/db add -D drizzle-kit @types/better-sqlite3
    pnpm --filter @arena/broker-paper add zod decimal.js nanoid date-fns ts-pattern

    # api/worker/feeds
    pnpm --filter @arena/api add fastify @fastify/websocket @fastify/cors @fastify/sensible pino zod
    pnpm --filter @arena/worker add pino bottleneck p-retry eventemitter3 zod decimal.js
    pnpm --filter @arena/feeds add ws undici bottleneck p-retry zod

    # agents/strategies/telemetry
    pnpm --filter @arena/agents add openai zod zod-to-json-schema jsonrepair p-retry gpt-tokenizer
    pnpm --filter @arena/strategies add zod yaml chokidar technicalindicators simple-statistics decimal.js
    pnpm --filter @arena/telemetry add pino @opentelemetry/api @opentelemetry/sdk-node csv-stringify

    # web
    pnpm --filter @arena/web add react react-dom react-router-dom @tanstack/react-query zustand zod react-hook-form @hookform/resolvers lightweight-charts recharts lucide-react clsx tailwind-merge class-variance-authority sonner
    pnpm --filter @arena/web add -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
Libraries to avoid in MVP
-------------------------

| Avoid                           | Reason                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| `ccxt`                          | Too much real exchange/trading surface area for a paper-only simulator |
| `alpaca-trade-api`, broker SDKs | Violates the “no real execution adapter” spirit                        |
| `langchain` / `llamaindex`      | Overkill; constrained JSON decisions are enough                        |
| `bullmq`                        | Requires Redis; unnecessary for local-first MVP                        |
| `redux`                         | Zustand + React Query is simpler here                                  |
| `prisma`                        | Drizzle is more transparent for event-sourced SQLite schemas           |
| Electron/Tauri                  | Not needed unless you later want a packaged desktop app                |

My recommended stack summary
----------------------------

Use:
    pnpm + TypeScript
    React + Vite + Tailwind
    Fastify + WebSocket
    SQLite + Drizzle + better-sqlite3
    Zod everywhere
    Pino logs
    OpenAI SDK pointed at OpenRouter
    ws + undici for public feeds
    Bottleneck + p-retry for rate limits
    Decimal.js for money/P&L
    Vitest + Playwright
    Lightweight Charts + Recharts
    OpenTelemetry packages for trace/metric naming

That gives you a safe, local-first, deterministic AI trading arena without accidentally drifting into real-money trading infrastructure.
