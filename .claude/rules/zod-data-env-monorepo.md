---
name: zod-data-env-monorepo
description: Zod data, environment, and monorepo contract standards.
globs:
  - "src/db/**/*.{ts,tsx}"
  - "src/env/**/*.{ts,tsx}"
  - "src/config/**/*.{ts,tsx}"
  - "packages/*/src/**/*.{ts,tsx}"
  - "packages/schemas/**/*.{ts,tsx}"
  - "prisma/**/*.{ts,tsx}"
  - "drizzle/**/*.{ts,tsx}"
---
# Zod Data Environment and Monorepo Contracts
## Shared Schema Package
- Place schemas reused by 2 or more apps or packages in `packages/schemas` or the repository's existing shared-contract package.
- Export schemas, `z.input` types, and `z.output` types from a package barrel that is consumed by API, UI, tests, and workers.
- Version public schemas with an explicit name or folder segment when an external client or persisted payload can outlive one deploy.
- Keep package-level schemas free of framework imports so they run in browser, server, worker, and test runtimes.
- Use schema composition methods such as `.extend()`, `.merge()`, `.pick()`, `.omit()`, and `.partial()` to preserve one source for shared field rules.
- Add at least 1 round-trip fixture for each shared schema consumed by both frontend and backend code.

## Data and Configuration Boundaries
- Parse environment variables during process startup through a single exported `env` module before application code reads configuration values.
- Parse database rows returned from raw SQL, views, JSON columns, third-party syncs, and migration scripts before domain services consume them.
- Validate data written into JSON columns, metadata fields, queues, caches, and event logs with named Zod schemas.
- Use separate schemas for database write input, database read output, and public API output when field visibility or coercion differs.
- Parse seeded data and migration fixtures before insert statements run in local, CI, and preview environments.
- Store schema-backed contract tests near the package that owns the schema and run them in the package test command.
