# Phase 2: API Migration — Discussion Log

> **Audit trail only.** Do not use as input to implementation agents without also reading `02-context.md` and `02-linear-issues.md`.
> Phase 2 is a Fastify migration for the local-first paper-trading simulator API; it must not add live-trading, brokerage, exchange execution, wallet-signing, custody, or fund-moving behavior.

**Date:** 2026-06-03
**Phase:** 2 — API Migration
**Prompt:** `/gsd-discuss-phase 2 add issues to linear`
**Areas discussed:** Linear issue decomposition, route compatibility, schema strategy, WebSocket lifecycle, deterministic test gate

---

## Verified Inputs

| Input | Status | Evidence |
|---|---|---|
| Phase 2 scope is Fastify 5 API migration | VERIFIED | `AI_Trading_Arena_MVP_Blueprint.md` Phase 2 lists Fastify 5, versioned routes, WebSocket plugin, and route tests. |
| Current API is raw `node:http` plus `ws` upgrade handling | VERIFIED | `apps/api/src/index.ts` imports `createServer` from `node:http` and `WebSocketServer` from `ws`. |
| Phase 1 is complete and Phase 2 is next | VERIFIED | `.planning/STATE.md` records `Phase: 2` and `completed_phases: 1`. |
| Direct Linear access is configured in this environment | UNKNOWN | No Linear MCP resource or `LINEAR_*` environment variable was available during this discussion pass. |

---

## Documentation Checks

Context7 is required for library-specific guidance, but no Context7 MCP resource was exposed in this session. Fallback research used official project documentation only:

- Fastify v5 migration guide: Fastify v5 requires Node.js v20+ and full JSON Schema objects for `querystring`, `params`, and `body` schemas.
- Fastify validation/serialization docs: schemas should be registered/used through Fastify validation and serialization paths rather than ad hoc parsing at route edges.
- `@fastify/websocket` docs: the plugin must be registered before routes that use `{ websocket: true }`, and route handlers must attach socket listeners synchronously to avoid dropped frames.
- Zod JSON Schema docs: Zod 4 exposes `z.toJSONSchema()` for converting Zod schemas into JSON Schema.

---

## Linear Issue Decomposition

### Q1: Should Phase 2 be one Linear issue or multiple dependent issues?

| Option | Description | Selected |
|---|---|---|
| One umbrella issue | Track the whole Fastify migration as a single issue. | |
| Dependent implementation issues | Use one parent issue with six child issues matching dependency waves. | ✓ |

**Decision:** Use a Phase 2 parent issue plus six child issues: bootstrap, HTTP route migration, Zod/JSON Schema contracts, WebSocket migration, tests, and phase acceptance gate.

**Rationale:** The migration has clear dependency boundaries and test gates. Child issues make it easier to land a safe sequence without weakening replayability, risk gating, schema validation, telemetry, or shutdown behavior.

### Q2: Should compatibility routes remain during migration?

| Option | Description | Selected |
|---|---|---|
| Remove old routes immediately | Only `/v1/*` routes exist after Phase 2. | |
| Temporary compatibility aliases | Keep current `/health`, `/api/demo/run`, `/api/runs/:runId/*`, and `/ws/runs/:runId/telemetry` as aliases while adding `/v1/*`. | ✓ |
| Compatibility redirect only | Return redirects from old paths to new paths. | |

**Decision:** Add `/v1/*` as the canonical API while keeping temporary compatibility aliases unless implementation proves the frontend can be changed in the same phase.

**Rationale:** Phase 2 is an API migration, not a dashboard rewrite. Aliases reduce cross-phase breakage and can be removed after Phase 4 updates the frontend to canonical `/v1/*` routes.

### Q3: Where should request/response schemas live?

| Option | Description | Selected |
|---|---|---|
| Inline in route modules | Define schemas next to each handler. | |
| Per-route `*.schemas.ts` files | Put route contracts in route-local schema modules when there are multiple request/response contracts. | ✓ |
| Shared package immediately | Move all API envelopes to `packages/core` now. | |

**Decision:** Use route-local `*.schemas.ts` modules for API envelopes in Phase 2, while importing domain Zod schemas from `@arena/core` for run IDs and event payloads.

**Rationale:** Keeps Fastify route modules thin, avoids redefining domain contracts, and allows later promotion of stable API envelopes to shared packages without blocking the migration.

### Q4: How should response validation be enforced?

| Option | Description | Selected |
|---|---|---|
| Fastify JSON Schema only | Convert Zod to JSON Schema for Fastify response schemas; rely on Fastify serialization. | |
| Zod parse plus JSON Schema | Parse outgoing payloads with Zod before return, and expose `z.toJSONSchema()` to Fastify for route schemas. | ✓ |

**Decision:** Validate outbound route payloads with Zod and register JSON Schema equivalents with Fastify.

**Rationale:** The repo invariant says agent/API outputs crossing boundaries should be schema validated. Zod parse gives deterministic failures in tests; JSON Schema preserves Fastify route contract behavior.

### Q5: Which WebSocket route should be canonical?

| Option | Description | Selected |
|---|---|---|
| `/ws/runs/:runId/telemetry` | Keep current route as the canonical path. | |
| `/v1/telemetry/stream?runId=...` | Match Phase 2 requirement exactly. | ✓ |
| `/v1/runs/:runId/telemetry/stream` | REST-shaped route with path params. | |

**Decision:** Implement canonical `GET /v1/telemetry/stream?runId=<id>` using Fastify WebSocket, with the old route as a temporary compatibility alias if needed.

**Rationale:** This directly matches the Phase 2 requirement while keeping run ID validation through the existing `RunIdSchema` before DB access.

### Q6: What is the Phase 2 acceptance gate issue responsible for?

| Option | Description | Selected |
|---|---|---|
| Tests only | Run existing tests and stop. | |
| Verification plus cleanup | Run API-focused checks, full checks, raw-http ownership grep, hash-chain demo verification, and update planning state. | ✓ |

**Decision:** Add a final acceptance-gate issue that verifies the migrated server, updates planning traceability, and records any compatibility aliases or follow-up removals.

**Rationale:** Phase 2 changes the API surface and shutdown behavior. A dedicated gate prevents partial migration from being treated as done.
