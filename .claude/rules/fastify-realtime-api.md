---
name: fastify-realtime-api
description: Fastify HTTP and WebSocket API standards for realtime server surfaces.
globs:
  - "apps/api/**/*.{ts,tsx}"
  - "packages/api/**/*.ts"
  - "packages/realtime/**/*.ts"
  - "src/routes/**/*.ts"
  - "src/plugins/**/*.ts"
---
# Fastify HTTP and WebSocket APIs
## Route Contracts
- [C7: Fastify] Define `schema.body`, `schema.querystring`, `schema.params`, `schema.headers`, and `schema.response` for HTTP routes that accept client data.
- [C7: Fastify] Type each route with Fastify generics for `Body`, `Querystring`, `Params`, `Headers`, and `Reply` whenever those shapes exist.
- [scope: api] Keep Zod as the source contract and connect it to Fastify validation through JSON Schema conversion or `preValidation` parsing.
- [C7: Fastify] Use `preValidation` for request validation and authentication gates, then use `preHandler` for loaded dependencies and request-scoped context.
- [scope: api] Return versioned route paths such as `/v1/...` and response envelopes parsed by shared Zod schemas.

## Real-Time Layer
- [scope: websocket] Mount WebSocket handlers through Fastify plugin encapsulation so connection lifecycle, request ids, and logger bindings share API context.
- [scope: websocket] Validate every inbound WebSocket message with shared Zod schemas before dispatching to agent, strategy, feed, or database workflows.
- [scope: websocket] Validate every outbound event payload with shared Zod schemas before sending chart, run-state, trade, metric, or reasoning updates.
- [tool: ws] Track connection id, authenticated principal or session id, subscribed topics, and last heartbeat timestamp as explicit connection state.
- [tool: Pino] Bind route id, connection id, request id, trace id, and message type to HTTP and WebSocket logs.

## Error Shape
- [scope: api] Map validation, OpenRouter, database, feed, and retry failures into typed error envelopes with stable `code`, `message`, `details`, and `requestId` fields.
- [tool: OpenTelemetry] Attach Fastify route spans and WebSocket message spans to the same trace when a real-time event originates from an HTTP action.
