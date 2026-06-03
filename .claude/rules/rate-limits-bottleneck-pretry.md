---
name: rate-limits-bottleneck-pretry
description: Bottleneck and p-retry integration standards for rate-limited provider clients.
paths:
  - "src/**/*.{ts,tsx,js,mjs,cjs}"
  - "lib/**/*.{ts,tsx,js,mjs,cjs}"
  - "packages/**/*.{ts,tsx,js,mjs,cjs}"
---
# Bottleneck and p-retry Rate Limit Rules
## Client Boundary
- Place Bottleneck and p-retry integration in provider client modules named `*.client.*`, `*.adapter.*`, or `*.gateway.*`.
- Route each external API operation through `limiter.schedule({ id, expiration, priority, weight }, () => pRetry(...))` or through a wrapper with the same fields.
- Assign `id` to every scheduled job using provider, operation, and a stable request correlation key.
- Set `expiration` on every scheduled job that can run under Redis clustering or multi-process workers.
- Configure one Bottleneck limiter per provider quota scope: provider, credential, region, endpoint class, or tenant.
- Configure `maxConcurrent` and `minTime` on each limiter, then add `reservoir`, `reservoirRefreshAmount`, `reservoirRefreshInterval`, or `reservoirIncrease*` settings when the provider publishes quota buckets.
- Combine every reservoir interval with `maxConcurrent` and `minTime` to smooth refreshed capacity.
- Use `currentReservoir()`, `counts()`, `running()`, or `clusterQueued()` in health diagnostics for active limiter state.

## Retry Policy
- Wrap the scheduled HTTP function with `pRetry()` for transient failures.
- Set p-retry options explicitly: `retries`, `factor`, `minTimeout`, `maxTimeout`, `randomize`, `maxRetryTime`, and `signal` when an AbortSignal exists.
- Parse HTTP `Retry-After` into `retryAfterMs` and attach it to a `RateLimitError` for 429 responses.
- In `onFailedAttempt`, wait `retryAfterMs` for `RateLimitError` and log `attemptNumber` plus `retriesLeft`.
- In `shouldConsumeRetry`, return `false` for `RateLimitError` and return `true` for retryable 5xx/network errors.
- In `shouldRetry`, return `true` for 429, 408, 425, 500, 502, 503, 504, and recognized network timeout errors.
- Throw p-retry `AbortError` for permanent client/auth states: 400, 401, 403, and 404.
- Pass caller cancellation through p-retry `signal` and the underlying fetch/client AbortSignal.

## Shutdown and Operations
- Register Bottleneck `error` event handling next to limiter construction.
- Register `failed` and `retry` event handling when Bottleneck owns retry timing.
- Use p-retry for HTTP retry classification and Bottleneck `failed` handling for queue/job failures.
- Call `limiter.stop()` or cluster `disconnect(false)` in worker shutdown paths after incoming work has been drained.
