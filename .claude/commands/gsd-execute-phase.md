---
description: Start a GSD workflow for planned phase work tied to roadmap, requirements, or blueprint milestones.
argument-hint: "[phase-or-plan]"
allowed-tools: [Read, Bash, Edit, Write]
---

Use this workflow for planned implementation phases that touch multiple framework or application surfaces.

1. Read the relevant phase plan, `docs/AI_TRADING_ARENA_BLUEPRINT.md`, `docs/PRACTICAL_LIBRARY_MAP.md`, and `docs/FRAMEWORK_TRACEABILITY.md`.
2. Run `/audit-blueprint-alignment` for the target scope and record any blocking safety or replay concerns.
3. Run `/rule-coverage` for the intended touched paths and load the smallest applicable rules.
4. Implement the phase in focused commits while keeping Fastify routes, WebSocket handlers, and app edges thin around domain packages.
5. Run `/replay-readiness` for simulator state-changing changes, then `/verify-changes` or the narrowest executable equivalent.
6. Summarize deliverables, verification commands, and remaining follow-up issues.
