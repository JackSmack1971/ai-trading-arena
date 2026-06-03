---
name: domain-contracts
description: Shared domain contract standards across backend, storage, and UI boundaries.
paths:
  - "packages/shared/**/*.ts"
  - "packages/db/**/*.ts"
  - "packages/domain/**/*.ts"
  - "apps/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---
# Shared Domain Contracts
## Zod Everywhere
- [scope: shared] Define request, response, database DTO, WebSocket event, feed event, and OpenRouter DTO schemas in shared Zod modules.
- [scope: shared] Export TypeScript types from Zod schemas with `z.infer` and import those types across Fastify, React, tests, and database layers.
- [scope: api] Parse untrusted HTTP, WebSocket, feed, database, and LLM inputs at the boundary closest to their source.
- [scope: api] Parse trusted-looking repository outputs again before sending them to the frontend or persisting derived state.
- [scope: shared] Version externally visible schemas with explicit schema names and stable event names.

## Database Layer
- [tool: Drizzle] Keep SQLite table definitions, relations, and query helpers in database packages rather than route handlers.
- [tool: better-sqlite3] Run synchronous SQLite access behind repository functions that expose typed inputs and parsed outputs.
- [scope: db] Store Decimal.js money, price, quantity, and P&L values as strings or integer minor units with explicit schema fields.
- [tool: Decimal.js] Perform fee, P&L, equity, exposure, and threshold math with Decimal instances from input parse through output serialization.
- [scope: db] Validate database rows with Zod response-shaping schemas before returning data to API, WebSocket, chart, or agent layers.

## Package Boundaries
- [tool: pnpm] Keep reusable contracts in workspace packages and import them through package names rather than relative paths across package roots.
- [tool: TypeScript] Use project references or workspace-aware tsconfig paths for shared packages so schema changes typecheck API, frontend, and tests together.
