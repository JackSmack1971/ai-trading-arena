---
name: observability-resilience
description: Observability, resilience, and failure-handling standards for production services.
paths:
  - "apps/api/**/*.{ts,tsx}"
  - "packages/telemetry/**/*.ts"
  - "packages/feeds/**/*.ts"
  - "packages/ai/**/*.ts"
  - "packages/realtime/**/*.ts"
---
# Observability and Resilience
## Structured Logging
- [tool: Pino] Use child loggers with request id, trace id, span id, run id, agent id, connection id, and workflow fields at the module boundary.
- [tool: Pino] Represent secrets, raw prompts, raw completions, and feed payload bursts with redacted values, hashes, counters, or sampled debug fields.
- [scope: backend] Log lifecycle events for feed connect, feed disconnect, reconnect, retry, rate-limit queue, OpenRouter request, database write, and WebSocket broadcast.
- [scope: api] Attach the stable error envelope code to logs and return the same code in HTTP or WebSocket error payloads.

## Traces and Metrics
- [tool: OpenTelemetry] Name spans with dotted domain verbs such as `http.fastify.route`, `ws.message.receive`, `feed.public.fetch`, `db.sqlite.query`, and `llm.openrouter.chat`.
- [tool: OpenTelemetry] Use metric names with dotted domains such as `feed.messages.received`, `ws.connections.active`, `llm.requests.total`, and `db.query.duration`.
- [tool: OpenTelemetry] Record model id, route id, retry count, limiter key, and event type as span attributes with bounded cardinality.
- [tool: OpenTelemetry] Propagate trace context from HTTP requests into WebSocket actions, feed-derived decisions, database writes, and OpenRouter calls.

## Rate Limits and Retries
- [tool: Bottleneck] Create named limiter groups for OpenRouter models, public feed hosts, database write bursts, and WebSocket broadcast fanout.
- [tool: p-retry] Classify retryable network, timeout, and rate-limit failures separately from validation and schema failures.
- [tool: undici] Use explicit request wrappers for public feed ingestion with URL, method, timeout, status, attempt, and response size logged as structured fields.
- [tool: ws] Emit heartbeat, reconnect, subscribe, unsubscribe, and close events into logs and metrics using the shared connection id.
