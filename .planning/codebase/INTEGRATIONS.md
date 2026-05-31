# External Integrations

**Analysis Date:** 2026-05-31

## APIs & External Services

**AI Inference Providers:**
- **OpenRouter API** - Orchestrates LLM calls for trading agent decisions.
  - SDK/Client: Handled via direct HTTP calls/clients in `packages/agents`.
  - Auth: API key provided in the `OPENROUTER_API_KEY` env var.
  - Site Headers: `HTTP_REFERER` and `OPENROUTER_SITE_TITLE` configured for OpenRouter ranking/attribution.

**Market Data Feeds:**
- **Public Crypto Feeds** - Intended for Coinbase, Binance, Kraken, and other public market-data ingestion (implemented under `packages/feeds`).
  - Integration method: Public market data WebSocket/REST endpoints (no private exchange keys or trading permissions).

## Data Storage

**Databases:**
- **SQLite Database** - Persistent local storage for the append-only event log.
  - Connection: Configured via `DB_FILE_NAME` env var (default: `./data/arena.db`).
  - Client: `drizzle-orm` + `better-sqlite3` native library.
  - Journaling: Configured with Write-Ahead Logging (WAL) mode for concurrent reads without blocking writes.
  - Migrations: Handled via `drizzle-kit` in `packages/db/drizzle/`.

## Authentication & Identity

**Authentication:**
- Local-first application. No login/OAuth identity system is implemented; database and API run entirely locally.

## Monitoring & Observability

**Logging:**
- Pino logger (under `packages/telemetry`) is intended for structured JSON logs.
- Log level configured via `LOG_LEVEL` environment variable.

## CI/CD & Deployment

**CI Pipeline:**
- Vitest tests run across the workspace via `pnpm test`.

## Environment Configuration

**Development:**
- Required env vars: `OPENROUTER_API_KEY` (if querying live agents), `DB_FILE_NAME` (sqlite file path).
- Secrets location: `.env` (gitignored), values must never be checked into version control.
- Mock/stub services: Fake feeds and mock OpenRouter responses are used in testing to keep simulations fully deterministic.

---

*Integration audit: 2026-05-31*
*Update when adding/removing external services*
