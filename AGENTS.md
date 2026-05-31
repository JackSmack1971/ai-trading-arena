# AGENTS.md

This repository is a local-first AI paper-trading simulator framework. It is not a live-trading system.

## Non-negotiable invariants

- Never add a real brokerage, exchange trading, wallet-signing, or fund-moving adapter.
- Keep all agent outputs behind schema validation, then the risk gate, before any paper-broker mutation.
- Keep position, exposure, drawdown, order-frequency, and strategy-switch limits deterministic inside the risk gate.
- Preserve replayability. State-changing simulator behavior must be reconstructable from append-only events.
- Keep secrets in environment variables or local secret storage. Never echo API keys, seed phrases, or decrypted secrets into logs, tests, fixtures, or docs.

## Working baseline

- Read `CLAUDE.md`, `docs/AI_TRADING_ARENA_BLUEPRINT.md`, `docs/PRACTICAL_LIBRARY_MAP.md`, and relevant `.claude/rules/*.md` files before editing related areas.
- Use Context7 for current library, framework, SDK, CLI, and cloud-service docs before writing or changing library-specific implementation guidance.
- Keep shared Zod schemas, event DTOs, and Decimal.js money helpers in shared packages rather than redefining them in app-local code.
- Treat Fastify routes and WebSocket handlers as thin edges around domain packages, feed adapters, telemetry, and persistence.
- Prefer deterministic fixtures, fake feeds, and mocked OpenRouter responses in tests.

## Architecture guardrails

- `packages/core` owns domain events, simulator primitives, and event contracts.
- `packages/feeds` owns public market-data ingestion only.
- `packages/agents` owns OpenRouter clients, prompts, decision schemas, and repair logic.
- `packages/strategies` owns strategy manifests, DSL/runtime loaders, and signal emission only.
- `packages/broker-paper` owns simulated fills, fees, slippage, positions, and P&L.
- `packages/telemetry` owns Pino logs, OpenTelemetry naming, and export formats.
- `apps/api` exposes typed HTTP/WebSocket surfaces.
- `apps/web` consumes typed contracts and renders dashboard state through charts and tables.

## Verification expectations

- Structural changes: confirm new Claude artifacts exist at the referenced paths.
- Rule or docs changes: verify filenames stay kebab-case and references still resolve.
- Code changes: run the narrowest relevant `pnpm` typecheck and test commands after the repo grows into executable packages.

## Review posture

- Report findings with evidence first.
- Mark claims as VERIFIED, INFERRED, or UNKNOWN when certainty differs.
- If a proposed change weakens replay, risk gating, schema validation, telemetry, or secret handling, block it until the design is corrected.
