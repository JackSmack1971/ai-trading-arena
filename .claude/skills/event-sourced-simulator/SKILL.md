---
name: event-sourced-simulator
description: Use when planning or reviewing simulator-core changes that affect replayability, paper-broker state, or domain events.
---

# Event-Sourced Simulator

Apply this skill when a task touches domain events, paper orders, fills, positions, P&L snapshots, run state, or replay.

## Workflow

1. Read `docs/AI_TRADING_ARENA_BLUEPRINT.md` sections covering product definition, event flow, risk gate, database tables, and replay.
2. Read the matching rules under `.claude/rules/` for Zod, Decimal.js, SQLite, Drizzle, telemetry, and testing.
3. Confirm the source of truth for each state transition.
4. Ensure every write can be reconstructed from append-only events.
5. Reject hidden mutable state, browser-only authority, or float-based money math.

## Output

- State transition under review
- Authoritative record
- Validation boundary
- Replay impact
- Verification needed
