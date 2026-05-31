---
name: public-feeds-ws-undici
description: Transport and review standards for public feed adapters using WebSocket, HTTP polling, SSE, or undici.
globs:
  - "apps/api/src/feeds/**/*.{ts,tsx}"
  - "apps/api/src/realtime/**/*.{ts,tsx}"
  - "apps/api/src/routes/**/*.{ts,tsx}"
  - "packages/*/src/**/*.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
---

# Public Feed Adapter Habits
## Scope
- Apply these habits when reviewing or creating public feed adapters that use WebSocket, HTTP polling, SSE, or streaming HTTP.
- Treat provider documentation as the contract for endpoint authentication, rate limits, message shape, heartbeat behavior, and reconnect policy.

## Transport Contracts
- Record each feed source with provider name, endpoint URL, protocol, channel list, expected payload format, rate-limit note, and recovery behavior.
- Keep public-feed credentials represented as empty adapter configuration fields and verify requests through unauthenticated provider endpoints.
- Model transport state with explicit lifecycle names: idle, connecting, open, subscribed, degraded, reconnecting, closing, and closed.

## Reliability Checks
- Include telemetry for connection open, subscription accepted, message decoded, decode failed, heartbeat missed, reconnect scheduled, and shutdown completed.
- Route malformed feed payloads through a schema validation boundary before they affect application state.
- Use bounded retry/backoff policies documented per provider, with jitter and a clear stop condition for process shutdown.
- Preserve the last confirmed subscription set and replay it after successful reconnect.

## Review Checklist
- Verify WebSocket adapters define heartbeat handling, close/error handling, max payload configuration, and subscription replay.
- Verify HTTP adapters define status handling, timeout configuration, dispatcher ownership, body parsing, and dispatcher shutdown.
- Verify tests cover normal messages, malformed messages, transport errors, heartbeat loss, reconnect, and rate-limit responses.
