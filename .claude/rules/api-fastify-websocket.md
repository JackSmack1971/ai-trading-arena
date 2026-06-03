---
name: api-fastify-websocket
description: Fastify and WebSocket API implementation standards for backend transport surfaces.
paths:
  - "apps/api/src/**/*.{ts,tsx}"
  - "apps/server/src/**/*.{ts,tsx}"
  - "packages/api/src/**/*.{ts,tsx}"
  - "packages/shared/src/**/*.{ts,tsx}"
  - "src/**/*.{ts,tsx}"
---
# Fastify and WebSocket API Standards
## Fastify Route Contracts
- Scope every HTTP and WebSocket route under an explicit versioned prefix such as `/v1`.
- Register each route inside a Fastify plugin whose exported name matches its bounded context, for example `marketDataRoutes`.
- Define route generics for every typed request part used by the handler: `Params`, `Querystring`, `Body`, `Headers`, and `Reply`.
- Attach a route `schema` for every public HTTP endpoint covering request parts and at least one success response status.
- Use shared Zod schemas from `packages/shared` as the source of truth and convert them to Fastify-compatible JSON Schema at the route boundary.
- Use `attachValidation: true` when the handler returns a domain-specific 400 envelope from `request.validationError`.
- Return typed objects from async handlers and use `reply.code(status).send(payload)` when the status differs from 200.
- Shape every success and error response with Zod before sending data sourced from SQLite, Drizzle, OpenRouter, or public feeds.

## Lifecycle Hooks and Logging
- Put authentication, API key checks, and WebSocket upgrade authorization in `preValidation`.
- Put database handles, rate limiters, and feed clients on Fastify decorators registered before dependent routes.
- Log every request failure with `request.log` or the injected Pino logger and include `routeId`, `requestId`, `statusCode`, and `err`.
- Include OpenTelemetry span names using `{transport}.{domain}.{operation}`, for example `http.marketData.snapshot` and `ws.agentTelemetry.stream`.
- Close Fastify, SQLite, WebSocket clients, public feed clients, and Bottleneck limiters through Fastify lifecycle hooks during shutdown.

## WebSocket Routes
- Register `@fastify/websocket` before all routes that set `{ websocket: true }`.
- Define every application WebSocket endpoint as `fastify.get(path, { websocket: true }, handler)`.
- Validate upgrade headers, route params, and query params with the same shared Zod schemas used by HTTP routes.
- Store active sockets in domain maps keyed by explicit identifiers such as `agentId`, `simulationId`, or `roomId`.
- Add each socket to its domain set on connection and remove it in the socket `close` handler; delete empty sets immediately.
- Parse inbound WebSocket messages through discriminated Zod event schemas before dispatch.
- Serialize outbound WebSocket events through shared Zod response schemas before `socket.send`.
- Send when `socket.readyState === WebSocket.OPEN` for fanout and replay flows.
- Use `ping`/`pong` heartbeat tracking with a 30000 ms interval for server-managed ws clients and clear the interval on server close.
- Route ingestion feed reconnects through Bottleneck and p-retry with an explicit attempt count from config recorded in logs and telemetry.
- Emit a typed error event before closing a socket from recoverable handler failures.
- Terminate unresponsive or protocol-invalid sockets and log the close reason with `request.log`.

## Real-Time Data and Tests
- Represent all money, price, quantity, and P&L fields as Decimal.js values or decimal strings at WebSocket and HTTP boundaries.
- Keep WebSocket payloads focused on deltas after the initial snapshot to support Lightweight Charts and Recharts updates.
- Test HTTP routes with `fastify.inject` for status code, response envelope, and schema validation behavior.
- Test WebSocket routes with a real ws client fixture covering auth rejection, successful subscription, fanout, heartbeat cleanup, and close cleanup.
- Keep route tests isolated from production SQLite by using a test database fixture registered through Fastify decorators.
