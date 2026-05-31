---
name: rate-limit-tests
description: Rate-limit behavior, retry, and backoff testing standards.
globs:
  - "**/*.test.{ts,tsx,js,mjs,cjs}"
  - "**/*.spec.{ts,tsx,js,mjs,cjs}"
  - "test/**/*.{ts,tsx,js,mjs,cjs}"
  - "tests/**/*.{ts,tsx,js,mjs,cjs}"
---
# Rate Limit Test Rules
## Client Tests
- Cover one success test proving each provider client invokes `limiter.schedule()` or a limiter-created wrapper before HTTP execution.
- Cover one 429 test proving `RateLimitError.retryAfterMs` is parsed from `Retry-After` and handled by p-retry `onFailedAttempt`.
- Cover one retry-budget test proving p-retry `shouldConsumeRetry` returns `false` for `RateLimitError`.
- Cover one permanent-error test proving 400/401/403/404 paths throw p-retry `AbortError`.
- Cover one transient-error test proving 500/502/503/504 or network timeout paths are accepted by `shouldRetry`.
- Cover one limiter-options test proving `maxConcurrent` and `minTime` exist on every provider limiter factory.
- Cover one reservoir test for each client using `reservoirRefresh*` or `reservoirIncrease*`, proving `maxConcurrent` and `minTime` are configured with the reservoir settings.
- Cover one observability test proving `error` listener is registered on every Bottleneck limiter factory.
- Cover one shutdown test proving worker teardown calls `limiter.stop()` or cluster `disconnect(false)`.
