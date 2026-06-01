# AI Trading Arena

This repository is a Claude Code framework for a local-first AI paper-trading simulator. It is not a live-trading system.

## Read order

On Windows, when using the Bash tool, use POSIX-compatible commands such as find, ls, grep, sed, and cat. Do not use CMD-only syntax like dir /s /b unless explicitly invoking cmd.exe or powershell.exe.

1. `AGENTS.md`
2. `docs/AI_TRADING_ARENA_BLUEPRINT.md`
3. `docs/PRACTICAL_LIBRARY_MAP.md`
4. `docs/FRAMEWORK_TRACEABILITY.md`
5. Matching `.claude/rules/*.md` files for the touched paths

## Core invariants

- Never add real brokerage, exchange execution, wallet-signing, custody, or fund-moving adapters.
- Agent decisions must be schema-validated before they reach the risk gate.
- The risk gate is final authority for every state-changing simulator action.
- Invalid or unrepairable model output becomes `NOOP` plus structured audit evidence.
- Replayability is mandatory: preserve append-only events, stable IDs, timestamps, and structured telemetry.

## Operating surfaces

- `.claude/settings.json` defines shared permissions and confirmation gates.
- `.claude/settings.local.json` is reserved for local project overrides and machine-specific preferences that should not be shared.
- `.claude/claude-security-guidance.md` and `.claude/security-patterns.json` define scanner-backed security review criteria for simulator-boundary and secret-handling changes.
- `.claude/hooks/` provides hard runtime blocks for high-risk shell commands and insecure secret-handling edits.
- `.claude/security-rules.md` defines simulator and secret-handling boundaries.
- `.claude/rules/rule-catalog.md` is the rule taxonomy and entrypoint for path-scoped guidance.
- `.claude/commands/` contains audit and review commands for blueprint, replay, rule coverage, and structural checks.
- `.claude/skills/` contains reusable workflows for simulator-core, agent-decision, and feed-adapter work.
- `.claude/agents/` contains isolated reviewer roles for simulator safety and dashboard/chart auditing.
- `.claude/output-styles/` standardizes specialized review output.
- `.claude/workflows/arena-audit.js` performs deterministic structural framework checks.

## Load by task

- Simulator core, paper broker, event store, replay, or P&L changes:
  Load `event-sourced-simulator` plus `risk-gate-parameters`, the Zod, Decimal.js, SQLite, Drizzle, telemetry, and testing rules.
- OpenRouter, prompts, observation packets, decision schemas, or retry logic:
  Load `agent-decision-safety` plus the OpenRouter, Zod, rate-limit, observability, and testing rules.
- Public feeds, WebSocket relays, polling adapters, reconnect behavior, or backpressure:
  Load `feed-adapter-hardening` plus the feed ingestion, realtime API, resilience, and testing rules.
- Strategy manifests, strategy DSL changes, hot-loading, or signal-generation boundaries:
  Load `event-sourced-simulator` plus `strategy-pack-permissions`, Zod, Decimal.js, and testing rules.
- Library-specific implementation guidance:
  Use Context7 before writing or revising framework instructions that mention a library, framework, SDK, CLI, or cloud service.

## Verification baseline

- Structural changes: run `node .claude/workflows/arena-audit.js`.
- Rule or guidance changes: verify filenames stay kebab-case ASCII and references still resolve.
- Future code changes: run the narrowest relevant `pnpm` typecheck and test commands once executable packages exist.
