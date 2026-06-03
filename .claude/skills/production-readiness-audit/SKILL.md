---
name: production-readiness-audit
description: Use when running structural audits, verifying workspace exclusions, and evaluating the production-readiness scorecard.
---

# Production Readiness Audit Skill

Use this skill to inspect framework surfaces, run checks, and score the repository against the Claude Code Production Readiness Guide.

## Workflow

1. **Verify Exclusions**: Inspect `claudeMdExcludes` inside `.claude/settings.json` to ensure directories like `node_modules`, `dist`, and `coverage` are ignored.
2. **Execute Structural Audit**: Run `node .claude/workflows/arena-audit.js`. If any structural findings are reported, resolve them before proceeding.
3. **Verify Tool Constraints**: Check subagent definitions in `.claude/agents/*.md`. Confirm auditor roles contain no execution or edit capabilities (`Bash`, `Write`, `Edit`).
4. **Calibrate Reasoning**: Confirm agent frontmatter contains `model`, `effort`, and `maxTurns` specifications.
5. **Run Scorecard**: Evaluate the 10 dimensions of the production-readiness scorecard and output a structured scorecard JSON conforming to `.claude/schemas/readiness-score.schema.json`.
