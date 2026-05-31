---
description: Run the deterministic structural audit for Claude-native framework surfaces.
argument-hint: ""
allowed-tools: [Read, Bash]
---

Run the deterministic Claude-framework audit for this repository.

1. Execute `node .claude/workflows/arena-audit.js` from the repository root.
2. Treat every reported finding as a framework-surface defect until verified otherwise.
3. Confirm the audit verified hook registration and hook script presence rather than only file counts.
4. Confirm the audit verified the `.claude/worktrees/` runtime parent when the framework references isolated worktrees.
5. Confirm the audit verified destructive deny coverage in `.claude/settings.json`, including the PowerShell-native variants used in this workspace.
6. Confirm the audit verified the project-level security guidance surfaces if the framework relies on simulator-boundary and secret-handling review criteria.
7. Confirm the audit verified output-style frontmatter so `.claude/output-styles/*.md` files remain real Claude output-style artifacts rather than loose markdown notes.
8. Confirm the audit verified frontmatter shape for `.claude/commands/*.md`, `.claude/output-styles/*.md`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, and `.claude/rules/*.md`.
9. Confirm the audit verified artifact identity consistency so rule, agent, output-style, and skill `name` metadata matches the owning filename or directory.
10. Confirm the audit verified that backticked framework evidence paths in `docs/FRAMEWORK_TRACEABILITY.md` still resolve.
11. If the workflow is clean, spot-check `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.claude/claude-security-guidance.md`, `.claude/security-patterns.json`, `.claude/hooks/`, `.claude/worktrees/`, and the most relevant rule files for stale or conflicting guidance.
12. Interpret artifact counts as reusable framework surfaces only; support docs such as `README.md` do not count toward command, agent, rule, or output-style totals.
13. Report the result with counts, evidence paths, and any remaining content-level cleanup opportunities.
