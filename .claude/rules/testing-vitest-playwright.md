---
name: testing-vitest-playwright
description: Vitest and Playwright testing standards across backend and frontend surfaces.
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
  - "e2e/**/*.{ts,tsx}"
  - "playwright.config.ts"
  - "vitest.config.ts"
---
# Vitest and Playwright Testing Rules
## Test Boundaries
- Use Vitest for package, server, schema, DB, money/P&L, retry, feed-ingestion, telemetry, and React component tests under `packages/**`, `apps/**`, and `tests/**`.
- Use Playwright for browser-visible flows under `e2e/**`, including onboarding, dashboard rendering, WebSocket-driven updates, chart interactions, and error-state recovery.
- Place shared test helpers in `packages/testing/**` or `tests/fixtures/**`; import them from tests rather than duplicating fixture setup.
- Pair each public Zod schema, Drizzle query helper, Decimal.js money/P&L function, rate-limit wrapper, and OpenTelemetry naming helper with at least one Vitest test covering valid and invalid inputs.

## Vitest Unit and Integration Tests
- Build reusable Vitest fixtures with `test.extend` for Fastify server, better-sqlite3 test database, OpenRouter client substitute, public feed client substitute, WebSocket server, and Pino sink.
- Register fixture teardown with Vitest `onCleanup` for database handles, Fastify servers, WebSocket servers, fake timers, temp files, and telemetry exporters.
- Use file-scoped fixtures for expensive resources such as SQLite databases and HTTP/WebSocket test servers; use test-scoped fixtures for mutable users, strategies, market ticks, and agent state.
- Assert outputs with `expect` against parsed Zod results, Decimal string values, HTTP status codes, WebSocket message envelopes, and Pino log fields.
- Use `test.each` or `describe.each` for schema edge cases, exchange feed message variants, Decimal.js rounding modes, retry outcomes, and chart data transforms.
- Use Vitest fake timers for Bottleneck, p-retry, heartbeat, debounce, and polling logic; advance time explicitly inside each timer test.
- Mock at the public network and model-provider boundary with deterministic undici, ws, and OpenRouter substitutes; exercise internal Fastify, Zod, Drizzle, Decimal.js, and telemetry code through real module calls.
- Store snapshots for stable JSON envelopes, telemetry names, and component DOM fragments built from deterministic fixtures.
- Run `vitest --coverage` for touched packages and keep coverage thresholds in `vitest.config.ts` as the project source of truth.

## Playwright End-to-End Tests
- Configure `playwright.config.ts` with `webServer` to start the Vite/Fastify dev target and `use.baseURL` for relative page navigation.
- Enable Playwright `trace: 'on-first-retry'` and collect failure screenshots or videos through `playwright.config.ts`.
- Use Playwright fixtures for isolated browser contexts and API request contexts in tests that combine UI, Fastify routes, and WebSocket API behavior.
- Select UI elements with `page.getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, and `getByTestId` when user-facing semantics are available.
- Assert UI state with Playwright web-first `expect` checks such as `toBeVisible`, `toHaveText`, `toHaveURL`, and chart container visibility after async actions.
- Seed E2E scenarios through API or database fixtures before navigation, then verify browser-visible output through the user flow.
- Cover dashboard paths for live feed connected/disconnected states, agent trade reasoning display, P&L/Decimal precision display, chart updates, and validation errors.
- Test WebSocket flows by opening the page, subscribing through the UI path, emitting deterministic feed messages from the test server, and asserting rendered timeline, chart, and log updates.
- Keep Playwright retries and worker counts in `playwright.config.ts`; use per-test annotations for scenarios requiring serial execution due to shared feed/server state.

## Stack-Specific Verification
- Validate Fastify route tests through `server.inject` or a test HTTP server fixture and assert Zod-shaped response bodies.
- Validate Drizzle migrations and queries against a disposable SQLite database fixture backed by better-sqlite3.
- Validate Decimal.js money/P&L tests with string equality or Decimal comparisons rather than JavaScript number rounding.
- Validate Pino logs by routing output to a test sink and asserting `level`, `msg`, `traceId`, `agentId`, and domain event fields when present.
- Validate OpenTelemetry names by asserting span and metric names plus attributes produced by test exporters for API, feed, model, retry, and DB paths.
- Validate React chart components with Vitest for pure data transforms and Playwright for browser-rendered Lightweight Charts/Recharts interactions.
