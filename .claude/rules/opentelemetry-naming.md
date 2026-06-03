---
name: opentelemetry-naming
description: OpenTelemetry trace, span, and metric naming standards.
paths:
  - "apps/api/src/**/*.{ts,tsx}"
  - "apps/web/src/**/*.{ts,tsx}"
  - "packages/**/src/**/*.ts"
  - "src/**/*.{ts,tsx}"
  - "server/**/*.{ts,tsx}"
  - "instrumentation/**/*.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
---
# OpenTelemetry Trace and Metric Naming

## Resource and Scope
- Configure one OpenTelemetry `NodeSDK` resource per runtime with `service.name` set to `api`, `web`, `worker`, or `feed-ingestor` and `service.version` read from package metadata.
- Acquire every tracer and meter with the pnpm workspace package name, such as `@app/api`, `@app/web`, or `@app/feed-ingestor`, plus the package version string.
- Store shared trace names, metric names, attribute keys, and instrument helpers in `packages/observability/src/naming.ts` for reuse by Fastify, ws, undici, Drizzle, OpenRouter, Vitest, and Playwright code.

## Trace Names
- Name every Fastify HTTP server span as `{http.request.method} {http.route}` using the templated route path, for example `GET /v1/agents/:agentId`.
- Attach `http.request.method`, `http.route`, `url.path`, `url.scheme`, `http.response.status_code`, `server.address`, and `network.protocol.version` to every Fastify server span.
- Record Fastify 4xx responses as completed request spans with `http.response.status_code`; reserve span status faults for runtime faults, transport faults, and dependency faults.
- Name every undici HTTP client span as `{http.request.method} {url.template}` when a template exists and `{http.request.method}` when only the concrete URL exists.
- Attach `http.request.method`, `server.address`, `server.port`, `url.full`, `http.response.status_code`, and `http.request.resend_count` on retried undici requests.
- Name every Drizzle or better-sqlite3 client span as `{db.operation.name} {db.collection.name}` for single-table operations and `{db.operation.name} sqlite` for cross-table operations.
- Attach `db.system.name: "sqlite"`, `db.namespace`, `db.operation.name`, and `db.collection.name` to every Drizzle span that touches one table.
- Wrap OpenRouter calls made through the OpenAI SDK in HTTP client spans named from the underlying method and URL template, then attach model and provider details as project-scoped attributes under `app.ai.*`.
- Name every ws ingress span `WS RECEIVE {channel}` and every ws egress span `WS SEND {channel}` using channel names from a static registry.
- Represent WebSocket subscription, strategy update, and agent-action events with at most one dynamic placeholder in each span name, for example `WS RECEIVE /agents/:agentId/action`.
- Propagate the active context through Bottleneck jobs and p-retry attempts so each retry span remains a child of the original feed, OpenRouter, Fastify, or WebSocket span.

## Metric Names
- Use OpenTelemetry stable HTTP metric names `http.server.request.duration` and `http.client.request.duration` as Histogram instruments with unit `s`.
- Use OpenTelemetry stable database metric name `db.client.operation.duration` as a Histogram instrument with unit `s` for SQLite and Drizzle operations.
- Name Histogram instruments with singular nouns, including project metrics such as `app.ws.message.duration` and `app.agent.decision.duration`.
- Name UpDownCounter instruments with a `.count` suffix, including `app.ws.connection.count`, `app.bottleneck.queue.count`, and `app.feed.subscription.count`.
- Name Counter instruments with plural nouns for monotonic totals, including `app.feed.ingested.messages`, `app.ws.sent.messages`, and `app.retry.failed.attempts`.
- Attach `http.request.method`, `http.response.status_code`, `server.address`, and `network.protocol.version` to HTTP duration metrics.
- Attach `db.system.name: "sqlite"`, `db.operation.name`, `db.collection.name`, and `db.namespace` to database duration metrics.
- Attach `app.feed.source`, `app.market.symbol`, and `app.strategy.name` to feed, chart, and agent metrics after Zod validation normalizes each value.
- Export Decimal.js money and P&L measurements in canonical numeric base units with `currency` and `app.money.scale` attributes.

## Logging and Verification
- Add `trace_id` and `span_id` from the active OpenTelemetry context to every Pino log entry produced inside Fastify routes, ws handlers, feed ingestion jobs, OpenRouter calls, and Drizzle operations.
- Validate custom telemetry attributes with shared Zod schemas before span or metric recording in `packages/observability`.
- Add Vitest coverage for every exported naming constant in `packages/observability/src/naming.ts` with exact string equality assertions.
- Add one Playwright or integration fixture that exercises a Fastify route, ws message, Drizzle query, and chart data response while asserting correlated `trace_id` propagation.
