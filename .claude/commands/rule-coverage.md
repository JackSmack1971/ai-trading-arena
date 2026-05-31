---
description: Map the current task to the smallest relevant rule set before editing.
argument-hint: "[touched paths]"
allowed-tools: [Read]
---

Map the current task to the framework rules before editing.

1. Identify the touched paths.
2. Read the matching files under `.claude/rules/`.
3. List the rules that materially constrain the change.
4. State any uncovered area that still needs a new rule, skill, agent, or workflow.
5. If no rule covers a risky area, propose the smallest new artifact needed before proceeding.
