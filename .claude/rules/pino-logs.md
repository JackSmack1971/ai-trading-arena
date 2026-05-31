---
name: pino-logs
description: Pino structured logging and redaction standards.
globs:
  - "apps/api/src/**/*.{ts,tsx}"
  - "packages/server/src/**/*.{ts,tsx}"
  - "packages/ingestion/src/**/*.{ts,tsx}"
  - "packages/observability/src/**/*.{ts,tsx}"
  - "packages/shared/src/**/*.{ts,tsx}"
  - "src/api/**/*.{ts,tsx}"
  - "src/server/**/*.{ts,tsx}"
  - "src/routes/**/*.{ts,tsx}"
  - "src/ingest/**/*.{ts,tsx}"
  - "src/observability/**/*.{ts,tsx}"
  - "test/**/*.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
  - "e2e/**/*.{ts,tsx}"
---
# Pino Logging Rules
## Logger Construction
- For Node.js runtime code, create one exported Pino root logger module and derive request, job, ingestion, database, and model-call loggers with `logger.child(...)`.
- For Fastify HTTP APIs, pass a Pino options object through `fastify({ logger: ... })` with `level`, `redact`, and `messageKey: "message"` configured at server creation.
- For Fastify route handlers and hooks, log with `request.log` so every HTTP record carries Fastify request context and the configured request id.
- For WebSocket handlers built with Fastify and `ws`, create a per-connection child logger with `connectionId`, `requestId`, `urlPath`, and `clientIp`.
- For frontend React, Vite, Tailwind, Lightweight Charts, and Recharts code, route client events through API or WS telemetry envelopes and keep Pino usage in Node.js packages.

## Structured Fields
- For every Pino log call, pass a structured object as the first argument and a stable message string as the second argument.
- For Error logging, place the Error instance under `err` and include `operation`, `boundary`, `durationMs`, `retryAttempt`, and `outcome` when available.
- For Zod validation logs, include `schemaName`, `boundary`, `issueCount`, `traceId`, and redacted issue paths from `.safeParse` or `.parse` results.
- For Decimal.js money and P&L logs, serialize values as decimal strings with `currency`, `instrument`, and `precisionSource` fields.
- For SQLite, Drizzle, and better-sqlite3 logs, include `dbSystem: "sqlite"`, `dbOperation`, `table`, `durationMs`, and row or count metadata while recording SQL templates with parameter placeholders.

## Redaction and Boundary Events
- For Pino configuration, define `redact.paths` covering `req.headers.authorization`, `req.headers.cookie`, `res.headers.set-cookie`, `headers.x-api-key`, `env.OPENROUTER_API_KEY`, `apiKey`, `input.messages`, `output.choices`, and model prompt payload fields.
- For OpenAI SDK calls pointed at OpenRouter, record `provider`, `model`, `requestId`, `latencyMs`, `tokenUsage`, `finishReason`, and retry metadata, and hash prompt or content payloads before logging.
- For public feed ingestion with `ws` and `undici`, record URL host, feed name, subscription type, status code, close code, reconnect attempt, and latency metrics.
- For Bottleneck and p-retry wrappers, log limiter key, queue or reservoir state when exposed, retry attempt, `backoffMs`, and final outcome at the boundary wrapping the external call.

## Levels
- Use `trace` for high-volume market tick and heartbeat summaries sampled by package-level policy.
- Use `debug` for local diagnostic details tied to `component`, `operation`, and `durationMs`.
- Use `info` for API startup and shutdown, route milestones, WebSocket lifecycle, ingestion session state, and completed model calls.
- Use `warn` for retries, validation recoveries, rate-limit pressure, stale feed data, and degraded external services.
- Use `error` for failed requests or jobs with `err`, `traceId`, `spanId`, and recovery status.
- Use `fatal` for process-ending startup, migration, telemetry, or shutdown failures with a final flush path.

## OpenTelemetry Correlation and Tests
- For OpenTelemetry integration, attach active span `traceId` and `spanId` from `@opentelemetry/api` to backend, ingestion, database, validation, and model-call logs.
- For Fastify request spans, use route templates such as `GET /api/orders/:id` in `spanName` and `route` fields and align log `operation` with the same template.
- For metrics-adjacent logs, use stable event names like `http.request.completed`, `ws.connection.closed`, `feed.reconnect.scheduled`, `db.query.completed`, and `model.request.completed`.
- For Vitest and Playwright fixtures, assert log shape, redaction behavior, trace correlation, and absence of raw secret or prompt fields using captured Pino streams.
