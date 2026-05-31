---
name: zod-api-contracts
description: Zod request, response, and API boundary contract standards.
globs:
  - "src/server/**/*.{ts,tsx}"
  - "src/api/**/*.{ts,tsx}"
  - "src/routes/**/*.{ts,tsx}"
  - "app/api/**/*.{ts,tsx}"
  - "pages/api/**/*.{ts,tsx}"
  - "packages/api/**/*.{ts,tsx}"
  - "convex/**/*.ts"
---
# Zod API Contracts
## Procedure and Route Validation
- Add a Zod `.input()` validator to every tRPC query, mutation, and subscription that accepts client-provided input.
- Add a Zod `.output()` validator to tRPC procedures that return database records, third-party payloads, filtered public views, or security-sensitive fields.
- Parse Express, NestJS, Next.js route-handler, and Convex function inputs at the first line where raw `body`, `query`, `params`, `headers`, or `args` become available.
- Store route schemas in `*.schema.ts` or `*.schemas.ts` files when the route has 2 or more request or response contracts.
- Return parsed `input` objects from route adapters to handlers so handlers receive typed `z.output` values.
- Map `safeParse` failures to a consistent validation error envelope with path, code, and message fields.

## Response and Error Shapes
- Validate outbound API responses with a response schema when the payload crosses a package boundary, service boundary, or public client boundary.
- Represent create and update contracts with separate schemas when required fields differ between the two operations.
- Derive patch/update schemas from create/base schemas with `.partial()`, `.pick()`, `.omit()`, or `.extend()` when fields share validation semantics.
- Parse route params and search params with string-aware schemas before converting IDs, pagination numbers, dates, or enums.
- Validate WebSocket and subscription messages on connection, receive, and send boundaries using separate inbound and outbound schemas.
- Expose public response schemas that include exactly the fields intended for client consumption.
