# External Integrations

**Analysis Date:** 2026-06-01

## AI / LLM

**OpenRouter API:**
- Purpose: LLM inference for paper trading agent decisions
- Auth: `OPENROUTER_API_KEY` environment variable
- SDK: OpenAI Node SDK (`client.chat.completions.create`) pointed at `baseURL: "https://openrouter.ai/api/v1"`
- Headers: `HTTP-Referer` and `X-OpenRouter-Title` via `defaultHeaders`
- Resilience: p-retry for transient failures; Bottleneck limiter keyed by model/workflow
- Models: OpenRouter model identifiers (e.g. `openai/gpt-4o`, `openrouter/free`) — validated via Zod before use
- Current state: Agent package (`packages/agents/src/index.ts`) uses deterministic local paper-agents for MVP demo; OpenRouter client not yet wired in repo source

## Data Feeds

**Coinbase WebSocket Feed (`packages/feeds/src/clients/coinbase.ts`):**
- Transport: WebSocket (`ws` ^8.18.0)
- Endpoint: Coinbase Advanced Trade public WebSocket
- Auth: None (`authRequired = false`, `auth: "public-keyless"`)
- Capabilities: `['TICKER']`
- Rate policy: 5 requests/second, backoff 1000–30000 ms with jitter
- Normalizer: `packages/feeds/src/normalizers/coinbase.ts`

**Binance WebSocket Feed (`packages/feeds/src/clients/binance.ts`):**
- Transport: WebSocket (`ws` ^8.18.0)
- Endpoint: Binance public stream
- Auth: None
- Normalizer: `packages/feeds/src/normalizers/binance.ts`

**Rate limiting for feeds:** Bottleneck ^2.19.5 — named limiters per provider in `packages/feeds/src/limiters.ts`

**Feed output:** All adapters emit `NormalizedMarketEvent` (Zod-validated via `@arena/core`) before publishing to broker, event store, or chart layers.

## Observability

**Structured Logging:**
- `pino` ^9.5.0 — used in `apps/api` (`pino({ name: 'api' })`), `apps/worker`, and feed adapters (`packages/feeds/src/logger.ts`)
- Child loggers per module with bound fields: `connectionId`, `requestId`, `sourceId`, `transport`, etc.
- Redaction configured for API keys, auth headers, prompt payloads
- Log level: `LOG_LEVEL` environment variable

**OpenTelemetry:**
- Package: `@arena/telemetry` (`packages/telemetry/`) — currently a stub (`src/index.ts` exports nothing)
- Target span naming convention: `{transport}.{domain}.{operation}` (e.g. `ws.agentTelemetry.stream`, `feed.coinbase.subscribe`)
- Target metric naming: `app.feed.ingested.messages`, `app.ws.connection.count`, etc.
- Not yet wired to an exporter in repo source

## Data Storage

**SQLite (local):**
- Connection: `DB_FILE_NAME` environment variable
- Client: `better-sqlite3` ^11.3.0 via `drizzle-orm` ^0.40.0
- Factory: `packages/db/src/client.ts` — `createDb(filePath)` / `createMemoryDb()`
- WAL mode enabled; migrations via `drizzle-kit`

**File Storage:** Local filesystem only (SQLite file + optional backup files)
**Caching:** None

## Authentication & Identity

- Local-first application; no login, OAuth, or session identity system
- API runs on localhost; no external auth provider

## CI/CD & Deployment

**Hosting:** Local-first; no cloud deployment target defined
**CI Pipeline:** Not configured (no `.github/workflows/` or equivalent detected)
**Testing:** `pnpm test` runs `vitest run` across all workspace packages

## Environment Configuration

**Required env vars:**
- `OPENROUTER_API_KEY` — LLM provider (optional if using deterministic local agents)
- `DB_FILE_NAME` — SQLite database file path
- `API_PORT`, `API_HOST` — API server binding
- `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` — browser-safe base URLs for frontend
- `LOG_LEVEL` — Pino log level

**Secrets location:** `.env` file (gitignored); never committed to version control

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None (all market data is ingested, not pushed to external endpoints)

---

*Integration audit: 2026-06-01*
