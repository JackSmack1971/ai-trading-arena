---
name: public-feed-ingestion
description: Public market-data ingestion standards for adapters, schemas, and relay paths.
globs:
  - "apps/api/src/feeds/**/*.{ts,tsx}"
  - "apps/api/src/realtime/**/*.{ts,tsx}"
  - "apps/api/src/routes/**/*.{ts,tsx}"
  - "packages/*/src/**/*.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
---
# Public Feed Ingestion Rules
## Scope
- Apply these rules to public feed adapters, Fastify route bridges, ws relay code, undici HTTP pollers, shared Zod schemas, and feed tests under the configured paths.
- Model each upstream source as a typed adapter with `sourceId`, `transport`, `endpoint`, `rateLimitPolicy`, and `parseMessage` fields before wiring it into Fastify or storage.
- Keep API credentials out of public feed adapters; represent each configured source as `auth: "none"` or `auth: "public-keyless"` in the adapter metadata.

## ws WebSocket Feeds
- Create upstream WebSocket clients with `new WebSocket(url, protocols, options)` and store the exact URL, selected protocol, and connection attempt counter in Pino child logger bindings.
- Add `open`, `message`, `error`, `close`, and `pong` handlers for every ws client before subscribing to upstream topics.
- Implement the ws heartbeat pattern with `isAlive`, `pong` handling, and a 30_000 ms ping interval; call `terminate()` after one missed pong cycle.
- Set `perMessageDeflate: false` for market-data ingestion unless a source contract documents compressed frames; when enabled, set `concurrencyLimit: 10` and `threshold: 1024`.
- Set `maxPayload` on each ws server or relay endpoint to the smallest documented upstream message ceiling plus 20 percent headroom.
- Inspect `bufferedAmount` before each relay send; when it exceeds the adapter high-water mark, pause upstream emission or drop the client relay frame with a structured `backpressure` log event.
- Use `pause()` and `resume()` around downstream write pressure when adapting high-volume ws streams into internal queues.
- Use `createWebSocketStream()` only for adapters that explicitly consume stream semantics; attach an `error` listener to the returned Duplex before piping.
- Close expected shutdowns with `close(code, reason)` and reserve `terminate()` for failed heartbeats, protocol violations, or process shutdown deadlines.

## undici HTTP Feeds
- Create a shared undici `Agent` or origin-specific `Pool` for each public HTTP feed family and pass it as the `dispatcher` for all adapter requests.
- Configure every undici dispatcher with `headersTimeout: 10_000` and `bodyTimeout: 10_000` unless the source contract states a stricter value.
- Limit kept-alive concurrency with `connections` on the dispatcher and mirror that limit in the source adapter's Bottleneck reservoir settings.
- Use `undici.fetch()` for JSON snapshot polling and convert `response.body` with `Readable.fromWeb()` for streaming snapshot or line-delimited endpoints.
- Compose undici retry behavior with a maximum of 3 retries, `minTimeout: 1000`, `maxTimeout: 10000`, `timeoutFactor: 2`, and `retryAfter: true` for idempotent GET requests.
- Wrap non-idempotent or state-changing HTTP calls in a source-specific adapter method; public feed ingestion permits GET and documented public subscription handshakes only.
- Emit a typed error object for every HTTP status `>= 400` with `sourceId`, `statusCode`, `endpoint`, retry attempt, and elapsed milliseconds.

## Validation, Persistence, and Telemetry
- Parse every inbound ws message and undici response through a shared Zod schema before publishing to the internal event bus, SQLite, charts, or OpenAI/OpenRouter agent context.
- Convert numeric price, size, fee, and P&L fields to Decimal.js at the schema boundary and store serialized decimal strings in Drizzle-managed SQLite rows.
- Log one Pino event for each connection lifecycle transition using `sourceId`, `transport`, `eventType`, `attempt`, and `correlationId` fields.
- Create one OpenTelemetry span per subscribe, reconnect, HTTP fetch, parse batch, and persistence batch with span names in `feed.<sourceId>.<operation>` format.
- Record metrics for `feed_messages_total`, `feed_parse_failures_total`, `feed_reconnects_total`, `feed_http_retries_total`, and `feed_backpressure_events_total`.
- Route retry scheduling through p-retry for adapter-level operations and Bottleneck for source-level rate budgets so transport code has one resilience owner.
- Publish only normalized feed DTOs to Fastify routes, ws client broadcasts, Lightweight Charts, and Recharts view models.

## Tests
- Cover every adapter with Vitest fixtures for valid payloads, malformed payloads, close events, heartbeat failure, HTTP `>= 400`, retry exhaustion, and backpressure threshold behavior.
- Use local fake ws servers and undici mock dispatchers in tests so public network availability has zero effect on unit test outcomes.
- Add one Playwright E2E path that starts the API, injects a deterministic fixture feed, and verifies the React chart layer receives normalized DTOs through the Fastify ws bridge.
