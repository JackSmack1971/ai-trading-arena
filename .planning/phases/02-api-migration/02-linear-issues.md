# Phase 2: API Migration — Linear Issues

> Source issue payload for Linear. Direct Linear creation was not possible in this environment because no Linear MCP server, CLI, or `LINEAR_*` token was available.

## Defaults for All Issues

| Field | Value |
|---|---|
| Project | AI Trading Arena MVP |
| Cycle | Phase 2 — API Migration |
| Labels | `phase-2`, `api`, `fastify`, `paper-trading-only` |
| Priority | High |
| Safety note | This is a local-first paper-trading simulator. Do not add real brokerage, exchange execution, wallet-signing, custody, or fund-moving behavior. |

---

## Parent Issue

### Title

Phase 2 — Fastify API migration

### Description

Migrate `apps/api` from raw `node:http` and manual `ws` upgrade handling to Fastify 5 with versioned `/v1` routes, schema-validated request/response contracts, `@fastify/websocket` telemetry streaming, deterministic route tests, and a full phase acceptance gate.

### Child Issues

- 02-01 — Add Fastify dependencies and `buildApp()` shell
- 02-02 — Migrate HTTP routes to canonical `/v1` modules
- 02-03 — Add Zod request/response schemas and JSON Schema wiring
- 02-04 — Migrate telemetry WebSocket to Fastify plugin
- 02-05 — Add Fastify route and WebSocket lifecycle tests
- 02-06 — Run Phase 2 acceptance gate and update planning state

### Parent Acceptance Criteria

- `POST /v1/demo/run` returns a validated response envelope.
- `GET /v1/telemetry/stream` accepts WebSocket upgrades.
- Fastify shuts down cleanly and closes active telemetry sockets.
- Existing hash-chain verification still passes after a demo run.
- Raw `http.createServer` no longer owns the API routing layer.

---

## 02-01 — Add Fastify dependencies and `buildApp()` shell

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-01` |
| Labels | `phase-2`, `api`, `fastify`, `bootstrap` |
| Depends on | Phase 1 complete |
| Blocks | `API-02-02`, `API-02-03`, `API-02-04`, `API-02-05` |

### Description

Install Fastify 5 migration dependencies and split the API entrypoint so tests can instantiate an app without binding a port.

### Scope

- Add runtime dependencies to `apps/api/package.json`: `fastify`, `@fastify/websocket`, `fastify-plugin`, and `fastify-type-provider-zod` if selected during implementation.
- Create `apps/api/src/app.ts` exporting `buildApp(options?: ApiServerOptions)`.
- Keep `apps/api/src/index.ts` as a thin bootstrap that calls `buildApp()`, listens on configured host/port, logs startup failures, and closes cleanly on process signals.
- Move health routing into `apps/api/src/routes/health.ts` with canonical `GET /v1/health`.
- Preserve `createApiServer()` compatibility only if needed by existing callers/tests during the migration; document any compatibility surface for removal after Phase 4.

### Acceptance Criteria

- `buildApp()` returns a Fastify instance without listening on a network port.
- `GET /v1/health` returns `{ ok: true, service: "arena-api" }` through `fastify.inject`.
- `apps/api/src/index.ts` no longer owns route definitions.
- Startup failures are logged through Fastify/Pino before `process.exit(1)`.

### Verification

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
```

---

## 02-02 — Migrate HTTP routes to canonical `/v1` modules

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-02` |
| Labels | `phase-2`, `api`, `fastify`, `routes` |
| Depends on | `API-02-01` |
| Blocks | `API-02-03`, `API-02-05`, `API-02-06` |

### Description

Move existing demo and run HTTP routes from raw request branching into Fastify route modules under `/v1`, preserving deterministic demo behavior and event replay semantics.

### Scope

- Create `apps/api/src/routes/demo.ts` with `POST /v1/demo/run` and `DELETE /v1/demo/run`.
- Create `apps/api/src/routes/runs.ts` with run events, telemetry, and summary HTTP routes.
- Move DB decoration into `apps/api/src/plugins/db.ts`, including migration behavior for non-injected DBs.
- Reuse existing domain functions for deterministic demo execution, telemetry building, replay, and hash-chain verification.
- Validate `runId` with `RunIdSchema` before DB reads or writes.
- Keep paper-broker mutations behind existing schema validation and deterministic risk gate flow.

### Acceptance Criteria

- `POST /v1/demo/run` seeds/runs the deterministic demo and returns event count, hash-chain status, and agent summaries.
- Run events, telemetry, and summary routes return the same semantic data currently returned by `/api/runs/:runId/*`.
- Invalid run IDs return a validation error envelope before any DB query.
- No route adds live trading or external fund-moving behavior.

### Verification

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
```

---

## 02-03 — Add Zod request/response schemas and JSON Schema wiring

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-03` |
| Labels | `phase-2`, `api`, `zod`, `schemas` |
| Depends on | `API-02-01`, `API-02-02` |
| Blocks | `API-02-05`, `API-02-06` |

### Description

Add request, response, params, and query schemas for Phase 2 HTTP routes and expose their JSON Schema equivalents to Fastify while preserving Zod as the source of truth.

### Scope

- Add route-local schema modules where routes have multiple contracts, such as `demo.schemas.ts`, `runs.schemas.ts`, and `telemetry-stream.schemas.ts`.
- Reuse `RunIdSchema`, event payload schemas, and simulator domain schemas from `@arena/core`; do not redefine domain DTOs in app-local code.
- Convert Zod schemas to JSON Schema via Zod 4 `z.toJSONSchema()` or the selected type-provider helper.
- Validate outbound route payloads with Zod before returning them from handlers.
- Map validation failures to a consistent error envelope with path, code, and message fields.

### Acceptance Criteria

- Every external HTTP route has params/query/body schemas where it reads inputs.
- Every success and expected error response has a schema.
- Route tests parse returned payloads through the same Zod schemas used by handlers.
- No app-local duplicate of shared domain event, run ID, money, or agent-decision schemas is introduced.

### Verification

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
```

---

## 02-04 — Migrate telemetry WebSocket to Fastify plugin

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-04` |
| Labels | `phase-2`, `api`, `websocket`, `telemetry` |
| Depends on | `API-02-01`, `API-02-02`, `API-02-03` |
| Blocks | `API-02-05`, `API-02-06`, Phase 4 dashboard work |

### Description

Replace manual `server.on('upgrade')` handling with `@fastify/websocket` and expose canonical telemetry streaming at `GET /v1/telemetry/stream`.

### Scope

- Register `@fastify/websocket` in `apps/api/src/plugins/websocket.ts` before all WebSocket routes.
- Create `apps/api/src/routes/telemetry-stream.ts` with `{ websocket: true }` route options.
- Validate `runId` from querystring with `RunIdSchema` before subscribing or reading DB state.
- Send an initial telemetry snapshot, then broadcast snapshots every 2 seconds.
- Preserve backpressure checks, heartbeat ping/pong every 30 seconds, and structured warning logs for socket errors.
- Add `preClose`/shutdown handling that clears intervals and closes active sockets with code `1001`.

### Acceptance Criteria

- `GET /v1/telemetry/stream?runId=<id>` accepts WebSocket upgrades and sends a `telemetry.snapshot` envelope.
- Invalid run IDs close or reject the connection deterministically without querying the DB.
- App shutdown clears intervals and closes active WebSockets.
- Manual `new WebSocketServer({ noServer: true })` and raw upgrade ownership are removed from the API routing layer.

### Verification

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
```

---

## 02-05 — Add Fastify route and WebSocket lifecycle tests

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-05` |
| Labels | `phase-2`, `api`, `tests`, `vitest`, `websocket` |
| Depends on | `API-02-01`, `API-02-02`, `API-02-03`, `API-02-04` |
| Blocks | `API-02-06` |

### Description

Add deterministic Vitest coverage for the migrated Fastify HTTP routes and telemetry WebSocket lifecycle.

### Scope

- Add `apps/api/src/__tests__/health.test.ts`, `demo.test.ts`, `runs.test.ts`, and `telemetry-stream.test.ts` or equivalent grouped tests.
- Use `buildApp()` and `fastify.inject` for HTTP route tests.
- Use a deterministic SQLite test DB fixture and close DB/app resources in test cleanup.
- Assert response payloads with Zod schemas, not only raw object shape.
- Use a WebSocket client fixture for connect, initial message, invalid run ID, close, heartbeat cleanup, and app shutdown cleanup.
- Include a test proving demo-run hash-chain verification remains valid after the Fastify route executes.

### Acceptance Criteria

- API tests cover health, demo run, run events, run summary, run telemetry, validation errors, and WebSocket lifecycle.
- Tests are deterministic and do not require live feeds, OpenRouter, brokerage APIs, or external network access.
- `pnpm --filter @arena/api test` passes.

### Verification

```bash
pnpm --filter @arena/api test
```

---

## 02-06 — Run Phase 2 acceptance gate and update planning state

### Linear Fields

| Field | Value |
|---|---|
| Issue ID | `API-02-06` |
| Labels | `phase-2`, `api`, `verification`, `planning` |
| Depends on | `API-02-01`, `API-02-02`, `API-02-03`, `API-02-04`, `API-02-05` |
| Blocks | Phase 3 and Phase 4 kickoff |

### Description

Verify the full Fastify migration, record evidence, and update planning traceability so Phase 3 and Phase 4 can depend on a stable `/v1` API surface.

### Scope

- Run the Phase 2 acceptance gate commands.
- Run structural checks confirming raw `http.createServer` no longer owns API routing and canonical `/v1` routes exist.
- Verify a demo run through Fastify preserves hash-chain validity.
- Record results in `.planning/phases/02-api-migration/02-VERIFICATION.md`.
- Update `.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/REQUIREMENTS.md` traceability/status if the phase passes.
- Document temporary compatibility aliases and remove/track follow-up cleanup if any remain.

### Acceptance Criteria

- `pnpm --filter @arena/api typecheck` passes.
- `pnpm --filter @arena/api test` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm db:validate` passes or reports only an understood fixture/environment limitation.
- Planning state marks Phase 2 complete only after all child issues are complete and verified.

### Verification

```bash
pnpm --filter @arena/api typecheck
pnpm --filter @arena/api test
pnpm typecheck
pnpm test
pnpm db:validate
rg "createServer|node:http|new WebSocketServer|server.on\('upgrade'" apps/api/src
rg "/v1/demo/run|/v1/telemetry/stream|buildApp" apps/api/src apps/api/src/__tests__
```
