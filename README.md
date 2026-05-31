# AI Trading Arena Framework

This workspace is a Claude Code framework for building a local-first AI paper-trading simulator. It defines the operating constraints, audit surfaces, and stack-specific guidance for a future implementation repository.

## What this framework enforces

- No live-trading execution, wallet signing, custody, or fund movement
- Schema-validated agent decisions before the risk gate
- Append-only event records for replay and forensics
- Structured telemetry, bounded feed ingestion, and explicit verification layers
- Current library guidance through Context7-backed rules

## Key files

- `CLAUDE.md`: compact project entrypoint
- `AGENTS.md`: working rules and invariants for coding agents
- `docs/AI_TRADING_ARENA_BLUEPRINT.md`: product and architecture blueprint
- `docs/PRACTICAL_LIBRARY_MAP.md`: stack and dependency guidance
- `docs/FRAMEWORK_TRACEABILITY.md`: blueprint-to-framework coverage map
- `.claude/settings.json`: shared permissions and confirmation gates
- `.claude/settings.local.json`: local-only project overrides that stay out of shared framework state
- `.claude/claude-security-guidance.md` and `.claude/security-patterns.json`: scanner-backed security review criteria for simulator and secret-handling changes
- `.claude/hooks/`: hard runtime guardrails for high-risk shell commands and insecure secret handling
- `.claude/security-rules.md`: simulator boundary and secret-handling rules
- `.claude/rules/rule-catalog.md`: rule taxonomy and selection guide

## Claude surfaces

- `.claude/commands/`: reusable audit and review commands
- `.claude/skills/`: repeatable high-context workflows
- `.claude/agents/`: isolated reviewer personas
- `.claude/output-styles/`: specialized review output formats
- `.claude/workflows/`: deterministic framework checks

## Verification

- Run `node .claude/workflows/arena-audit.js` from the workspace root after framework changes.
- Treat any missing file, naming violation, or legacy rule surface as a framework defect.
