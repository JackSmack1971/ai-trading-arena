# Phase 2: API Migration — Context

## Goal

Migrate `apps/api` from the current raw Node HTTP server to Fastify 5 while preserving deterministic simulator behavior, append-only event replayability, risk-gate ordering, schema validation, and local-only paper-trading boundaries.

## Non-Negotiable Boundaries

- Do not add real brokerage, exchange trading, wallet-signing, custody, or fund-moving adapters.
- Agent decisions must remain schema-validated before reaching the deterministic risk gate.
- Paper-broker mutations must continue to be event-sourced and replayable from append-only DB events.
- Route handlers and WebSocket handlers should stay thin edges around domain packages, persistence, telemetry, and simulator primitives.
- Secrets must stay in environment variables or local secret storage and must not be logged, committed, or copied into test fixtures.

## Current State

- `apps/api/src/index.ts` currently owns bootstrap, routing, telemetry projection, deterministic demo execution, CORS headers, raw `http.createServer`, and `ws` upgrade handling in one module.
- Existing HTTP routes are:
  - `GET /health`
  - `POST /api/demo/run?runId=<id>`
  - `GET /api/runs/:runId/events`
  - `GET /api/runs/:runId/telemetry`
  - `GET /api/runs/:runId/summary`
- Existing WebSocket route is `GET /ws/runs/:runId/telemetry` via manual upgrade handling.
- Phase 2 canonical routes should be under `/v1`, including `POST /v1/demo/run`, `DELETE /v1/demo/run`, run event/summary/telemetry routes, and `GET /v1/telemetry/stream` for WebSocket telemetry.

## Target Structure

| Artifact | Purpose |
|---|---|
| `apps/api/src/app.ts` | Exports `buildApp()` for runtime and tests. |
| `apps/api/src/index.ts` | Thin bootstrap: build app, listen, log startup failures, close cleanly. |
| `apps/api/src/plugins/db.ts` | Registers SQLite DB decorator and migration behavior. |
| `apps/api/src/plugins/logger.ts` | Registers shared `@arena/telemetry` logger decorator or request logger bridge. |
| `apps/api/src/plugins/websocket.ts` | Registers `@fastify/websocket` before WebSocket routes. |
| `apps/api/src/routes/health.ts` | `GET /v1/health` plus optional compatibility alias. |
| `apps/api/src/routes/demo.ts` | `POST /v1/demo/run` and `DELETE /v1/demo/run`. |
| `apps/api/src/routes/runs.ts` | Run events, telemetry, and summary HTTP routes. |
| `apps/api/src/routes/telemetry-stream.ts` | Fastify WebSocket telemetry stream. |
| `apps/api/src/__tests__/` | `fastify.inject` HTTP tests and WebSocket lifecycle tests. |

## Dependency Waves

1. **02-01 Bootstrap:** Add Fastify dependencies and `buildApp()` shell with health route.
2. **02-02 HTTP routes:** Move existing demo and run routes behind `/v1` without changing simulator behavior.
3. **02-03 Schemas:** Add Zod request/response schemas and JSON Schema wiring for Fastify contracts.
4. **02-04 WebSocket:** Move telemetry stream to `@fastify/websocket`, including heartbeat and cleanup.
5. **02-05 Tests:** Add route and WebSocket lifecycle tests with deterministic DB fixtures.
6. **02-06 Gate:** Run narrow API checks, full checks, raw-http ownership checks, and planning updates.

## Acceptance Gate

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
pnpm typecheck
pnpm test
pnpm db:validate
```

Additional structural checks:

```bash
rg "createServer|node:http|new WebSocketServer|server.on\('upgrade'" apps/api/src
rg "/v1/demo/run|/v1/telemetry/stream|buildApp" apps/api/src apps/api/src/__tests__
```

## Linear Import Note

This environment did not expose Linear credentials or a Linear MCP server. `02-linear-issues.md` is therefore the source-of-truth issue payload to copy into Linear or import with a Linear-connected tool.
