---
description: Audit the framework against the blueprint, library map, and current Claude surfaces.
argument-hint: "[scope]"
allowed-tools: [Read, Bash]
---

Audit the repository against `docs/AI_TRADING_ARENA_BLUEPRINT.md`, `docs/PRACTICAL_LIBRARY_MAP.md`, `CLAUDE.md`, `AGENTS.md`, and relevant `.claude/rules/*.md` files.

1. Confirm the repo still describes a local paper-trading simulator rather than a live-trading product.
2. Verify architecture claims match the blueprint: feeds, agents, broker-paper, telemetry, API, web, replay, and event sourcing.
3. Check that agent-decision validation, risk gating, structured telemetry, and replayability are preserved in the current design.
4. Check library guidance against the current stack rules before accepting new framework claims.
5. Return findings with `VERIFIED`, `INFERRED`, or `UNKNOWN`, plus evidence paths and the next smallest safe fix.
