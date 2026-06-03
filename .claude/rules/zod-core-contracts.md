---
name: zod-core-contracts
description: Core Zod schema and shared validation contract standards.
paths:
  - "src/**/*.{ts,tsx}"
  - "app/**/*.{ts,tsx}"
  - "pages/**/*.{ts,tsx}"
  - "server/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
  - "convex/**/*.ts"
---
# Zod Core Contracts
## Schema Ownership
- Define one exported Zod schema for each external data shape at API, form, database, environment, file, and realtime boundaries.
- Name schemas with the `Schema` suffix and colocate them beside the boundary they validate or in `packages/schemas` when shared by 2 or more packages.
- Export `z.input<typeof Schema>` for accepted raw values when a schema preprocesses, coerces, or transforms data.
- Export `z.output<typeof Schema>` for post-parse values consumed by application services and UI components.
- Use `schema.parse(value)` at trusted server boundaries where an exception should stop the request or startup path.
- Use `schema.safeParse(value)` at user-facing, batch, test-fixture, upload, and realtime boundaries where callers need structured success and failure branches.

## Object Boundaries
- Select an explicit unknown-key policy for each object schema: default strip for normalization, `.strict()` for closed contracts, and `.passthrough()` for extension metadata.
- Parse raw JSON, request payloads, search params, route params, environment variables, database rows, and fixture objects before they enter domain logic.
- Keep transforms inside schemas when the transformed value has a single canonical representation across the project.
- Keep business-rule decisions in services after parsing when the decision depends on persisted state, authorization, clocks, or external systems.
- Return parsed values from boundary adapters so downstream code receives Zod-validated data rather than raw transport data.
- Include at least 1 schema-level message for each user-facing field constraint surfaced in a form or API response.
