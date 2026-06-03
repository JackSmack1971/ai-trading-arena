# Claude Framework Surface

This `.claude/` directory is the project-local operating layer for the AI Trading Arena framework.

- `settings.json` sets shared permissions, confirmations, and safe workflow entrypoints.
- `settings.local.json` is the developer-local override layer for machine-specific project behavior and should stay uncommitted.
- `claude-security-guidance.md` supplies project-level review criteria for the Claude Security Guidance surface.
- `security-patterns.json` supplies project-local scanner patterns for secret exposure and real-trading drift.
- `hooks/` provides hard runtime gates for high-risk shell commands and insecure secret-handling edits.
- `worktrees/` is the runtime parent for Claude-created isolated Git worktrees and keeps those transient copies out of the shared framework tree.
- `rules/rule-catalog.md` is the taxonomy for path-scoped engineering constraints, and `rules/*.md` contains the detailed stack rules.
- `commands/` defines reusable repo tasks such as blueprint and replay audits.
- `skills/` packages repeatable high-context workflows for simulator, feed, and agent work.
- `agents/` isolates narrow review roles for safety and dashboard validation.
- `workflows/` contains deterministic orchestration helpers for structural audits.
- `output-styles/` standardizes how specialized reviews should be reported.
- `../docs/FRAMEWORK_TRACEABILITY.md` maps blueprint requirements to concrete framework artifacts for audits.

Hard constraint: do not use this framework to add real order routing or secret-exposing debug flows.

## Local skill shell execution

`.claude/settings.local.json.example` keeps `disableSkillShellExecution` set to `true` to preserve the shared safe default from `.claude/settings.json`. Developers who need shell execution from skills must opt in explicitly in their private `.claude/settings.local.json` after reviewing the risk and keeping secrets out of tool output.
