---
name: feed-adapter-hardening
description: Use when working on public market-data ingestion, WebSocket relays, polling adapters, reconnect logic, or backpressure.
---

# Feed Adapter Hardening

Use this skill when a task touches upstream market-data adapters or the bridge from feeds into the simulator and dashboard.

## Workflow

1. Read the blueprint sections for supported public feeds, triggers, event flow, and dashboard updates.
2. Read `.claude/rules/public-feed-ingestion.md`, `.claude/rules/websocket-realtime-standards.md`, `.claude/rules/fastify-realtime-api.md`, and `.claude/rules/observability-resilience.md`.
3. Confirm each upstream source has explicit transport, endpoint, rate-limit, retry, heartbeat, and backpressure behavior.
4. Confirm payload normalization happens before persistence, broadcast, charting, or agent context construction.
5. Confirm tests cover malformed payloads, disconnects, reconnects, retries, and downstream pressure.

## Output

- Feed source or relay under review
- Transport and rate-limit policy
- Normalization boundary
- Failure and reconnect behavior
- Required tests
