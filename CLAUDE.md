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

<!-- GSD:project-start source:PROJECT.md -->

## Project

**AI Trading Arena**

A local-first, event-sourced AI paper-trading simulator where LLM agents (via OpenRouter) observe live market data, make trading decisions, and compete in a fully replayable arena — all visible in a React dashboard. It is a research and experimentation platform, not a live-trading system. No real funds, no real orders, no real exchange connectivity.

**Core Value:** An AI agent you can watch make paper trades in real time — the full loop from LLM decision to chart update, replayable and auditable.

### Constraints

- **No real execution:** PaperRiskGate categorically rejects `executionMode === 'LIVE'` or `executionVenue === 'REAL'` — non-negotiable invariant
- **Local-first SQLite:** better-sqlite3 is synchronous; single-process write ownership; WAL mode at startup
- **TypeScript strict:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules` — no `any` escapes at domain boundaries
- **Zod as source of truth:** All schemas live in `packages/core`; TypeScript types derived via `z.infer`; never vice versa
- **Secret isolation:** `OPENROUTER_API_KEY` env-var only; never logged, never in browser bundles
- **Replayability:** Every state change is a persisted, hash-chained event; no in-memory-only mutations are final

<!-- GSD:project-end -->

## Technical Context

For detailed project guidelines, conventions, and architecture maps, refer to:
- **Stack & Tooling**: [.planning/codebase/STACK.md](file:///f:/ai-trading-arena/.planning/codebase/STACK.md)
- **Conventions & Naming**: [.planning/codebase/CONVENTIONS.md](file:///f:/ai-trading-arena/.planning/codebase/CONVENTIONS.md)
- **System Architecture**: [.planning/codebase/ARCHITECTURE.md](file:///f:/ai-trading-arena/.planning/codebase/ARCHITECTURE.md)


<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| agent-decision-safety | Use when changing prompts, OpenRouter clients, decision schemas, repair logic, or risk-gate integration. | `.claude/skills/agent-decision-safety/SKILL.md` |
| event-sourced-simulator | Use when planning or reviewing simulator-core changes that affect replayability, paper-broker state, or domain events. | `.claude/skills/event-sourced-simulator/SKILL.md` |
| feed-adapter-hardening | Use when working on public market-data ingestion, WebSocket relays, polling adapters, reconnect logic, or backpressure. | `.claude/skills/feed-adapter-hardening/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
