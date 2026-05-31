# Workflows

Workflow scripts provide deterministic checks or orchestration helpers.

- `arena-audit.js`: structural framework audit for required files, directories, minimum artifact counts, naming, and legacy rule surfaces.
- `arena-audit.js` verifies frontmatter shape for rules, commands, agents, skills, and output styles so Claude-native artifacts stay parseable.
- `arena-audit.js` verifies artifact identity consistency so rule, agent, output-style, and skill `name` metadata matches the owning filename or directory.
- `arena-audit.js` verifies backticked framework evidence paths in `docs/FRAMEWORK_TRACEABILITY.md` still resolve.
- `arena-audit.js` verifies project-local hook registration for the hard guardrails referenced by the framework.
- `arena-audit.js` verifies destructive deny coverage in `.claude/settings.json`.
- `arena-audit.js` verifies `.claude/settings.json`, `.claude/settings.local.json`, and `.claude/security-patterns.json` remain valid JSON.
- `arena-audit.js` verifies the project-level security guidance files required for scanner-backed review of simulator-boundary and secret-handling changes.
- `arena-audit.js` verifies the `.claude/worktrees/` runtime parent exists when the framework advertises isolated worktree support.
- `arena-audit.js` verifies the local settings override surface exists and that project `.gitignore` rules keep local-only settings and transient worktrees out of shared framework state.
- Count outputs exclude support docs such as `README.md` so the reported totals reflect actual reusable framework artifacts.
