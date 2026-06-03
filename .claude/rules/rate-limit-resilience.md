---
name: rate-limit-resilience
description: Rate-limit handling, retry, and backoff resilience standards.
paths:
  - "apps/api/**/*.ts"
  - "packages/**/*.ts"
  - "src/**/*.ts"
  - "**/*feed*.ts"
  - "**/*retry*.ts"
  - "**/*limiter*.ts"
  - "**/*client*.ts"
---
# Rate Limit and Retry Resilience
## Scope
- Apply this rule to Bottleneck and p-retry code in `apps/api`, shared feed/client packages, OpenRouter/OpenAI client adapters, Fastify route helpers that issue outbound calls, and ws/undici public-feed ingestion.

## Limiter Ownership
- Create one Bottleneck limiter per upstream provider and quota class, named with a stable `id` such as `feed:coingecko:rest` or `llm:openrouter:chat`.
- Configure each limiter with explicit `maxConcurrent`, `minTime`, and provider-named quota constants in milliseconds before first use.
- Use `reservoir`, `reservoirRefreshAmount`, and `reservoirRefreshInterval` for fixed-window provider quotas; store the values beside the provider adapter.
- Run every undici REST call, OpenRouter SDK request, and WebSocket reconnect handshake through `limiter.schedule({ id, weight, expiration }, operation)`.
- Set `expiration` on scheduled jobs to a provider-specific timeout budget so stale feed work resolves as a Bottleneck error path.
- Choose exactly one retry owner per operation: p-retry for HTTP/network/upstream classification; Bottleneck `failed` return delays for limiter execution failures.

## Retry Classification
- Wrap scheduled outbound operations in `pRetry` with explicit `retries`, `factor`, `minTimeout`, `maxTimeout`, `randomize`, and `maxRetryTime`.
- Pass an `AbortSignal` from Fastify request context, WebSocket lifecycle shutdown, or process shutdown into p-retry for cancellation.
- Represent HTTP 429 as `RateLimitError` carrying retry metadata and use `shouldConsumeRetry` to preserve retry budget while the limiter absorbs quota pressure.
- Represent HTTP 401 and schema-contract failures as terminal errors through `shouldRetry` returning `false`.
- Represent HTTP 404 for missing public resources as `AbortError` so retry loops stop immediately.
- Treat HTTP 503 and transient undici network failures as retryable through `shouldRetry` while `maxRetryTime` remains open.

## Observability
- Register Bottleneck `error`, `depleted`, `failed`, and `retry` event handlers during limiter construction.
- Log limiter events with Pino fields: `provider`, `operation`, `jobId`, `retryCount`, `queued`, `running`, `reservoir`, and `error.message`.
- Log p-retry `onFailedAttempt` fields: `provider`, `operation`, `attemptNumber`, `retriesLeft`, `retriesConsumed`, and `retryDelay`.
- Attach OpenTelemetry span attributes using dotted names: `rate_limiter.provider`, `rate_limiter.queued`, `retry.attempt`, `retry.delay_ms`, and `upstream.status_code`.
- Sample Bottleneck `counts()`, `running()`, and `currentReservoir()` on the feed-ingestion metrics interval and publish summarized values to the dashboard WebSocket payload.
- Raise a structured warning event when `counts().QUEUED` exceeds 100 for a provider limiter.

## Data Integrity
- Validate successful upstream payloads with shared Zod schemas before Drizzle writes or frontend chart updates.
- Store retry exhaustion events in SQLite with provider, operation, status code, final error class, attempts consumed, and elapsed milliseconds.
- Use Decimal.js for parsed price, balance, P&L, and quote-size values after Zod validation and before chart serialization.

## Testing
- Cover each provider limiter with Vitest tests for first-attempt success, 429 budget preservation, 404 abort, 503 retry, and final exhaustion.
- Use fake timers or deterministic retry delays in Vitest so assertions include exact `attemptNumber`, `retriesConsumed`, and queue-count transitions.
- Add one Playwright or API-level scenario that shows degraded feed status in the React dashboard after retry exhaustion.
- Add one ws reconnection test proving reconnect attempts enter the provider Bottleneck limiter before opening a socket.
