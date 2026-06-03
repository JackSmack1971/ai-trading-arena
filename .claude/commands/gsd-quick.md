---
description: Start a lightweight GSD workflow for small fixes, documentation updates, and ad-hoc tasks.
argument-hint: "[task]"
allowed-tools: [Read, Bash, Edit, Write]
---

Use this quick workflow for bounded changes that do not require phase planning.

1. Run `/rule-coverage` for the intended touched paths and read the smallest matching rule set.
2. Confirm the change preserves the local-first paper-trading invariants in `CLAUDE.md` and `AGENTS.md`.
3. Make the smallest focused edit needed for the task.
4. Run the narrowest relevant verification command; for framework-surface changes, run `node .claude/workflows/arena-audit.js`.
5. Summarize changed files, verification evidence, and any residual risks.
