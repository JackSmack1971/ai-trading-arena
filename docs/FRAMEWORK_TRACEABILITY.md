# Framework Traceability

This file maps blueprint requirements to the active Claude framework surfaces so audits can verify coverage rather than infer it.

## Product boundary and safety

| Blueprint concern | Framework evidence |
| --- | --- |
| Local-first paper-trading only | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/claude-security-guidance.md` |
| No real execution adapter | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/hooks/pre-tool-use.js`, `.claude/security-patterns.json` |
| Secret handling and no browser secret echo | `AGENTS.md`, `.claude/settings.json`, `.claude/security-rules.md`, `.claude/hooks/pre-tool-use.js`, `.claude/claude-security-guidance.md`, `.claude/security-patterns.json` |
| Risk gate as final authority | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/commands/replay-readiness.md` |
| Risk-engine parameterization and rejection semantics | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/commands/replay-readiness.md`, `.claude/rules/risk-gate-parameters.md` |
| Invalid model output becomes NOOP | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/skills/agent-decision-safety/SKILL.md` |

## Architecture and stack

| Blueprint concern | Framework evidence |
| --- | --- |
| pnpm TypeScript monorepo | `.claude/rules/pnpm-typescript.md`, `CLAUDE.md` |
| Fastify API and WebSocket server | `.claude/rules/api-fastify-websocket.md`, `.claude/rules/fastify-api-standards.md`, `.claude/rules/fastify-realtime-api.md`, `.claude/rules/websocket-realtime-standards.md` |
| React/Vite/Tailwind dashboard | `.claude/rules/react-vite-tailwind.md`, `.claude/rules/ui-data-visualization.md` |
| SQLite + Drizzle + better-sqlite3 | `.claude/rules/sqlite-drizzle-better-sqlite3.md` |
| Zod everywhere | `.claude/rules/zod-core-contracts.md`, `.claude/rules/zod-api-contracts.md`, `.claude/rules/zod-data-env-monorepo.md`, `.claude/rules/zod-files-realtime-tests.md`, `.claude/rules/zod-frontend-forms-query.md` |
| OpenRouter through OpenAI SDK | `.claude/rules/openai-openrouter.md`, `.claude/rules/openrouter-sdk.md` |
| Strategy manifests stay permission-bounded and signal-only | `AGENTS.md`, `CLAUDE.md`, `.claude/rules/strategy-pack-permissions.md`, `.claude/skills/event-sourced-simulator/SKILL.md` |
| Pino + OpenTelemetry observability | `.claude/rules/pino-logs.md`, `.claude/rules/opentelemetry-naming.md`, `.claude/rules/observability-resilience.md` |
| Public feeds via ws and undici | `.claude/rules/public-feed-ingestion.md`, `.claude/rules/public-feeds-ws-undici.md` |
| Bottleneck and p-retry rate limits | `.claude/rules/rate-limits-bottleneck-pretry.md`, `.claude/rules/rate-limit-resilience.md`, `.claude/rules/rate-limit-tests.md` |
| Lightweight Charts + Recharts split | `.claude/rules/data-visualization-charts.md`, `.claude/rules/ui-data-visualization.md`, `.claude/output-styles/chart-review.md` |

## Replay, events, and verification

| Blueprint concern | Framework evidence |
| --- | --- |
| Deterministic simulator core | `AGENTS.md`, `.claude/skills/event-sourced-simulator/SKILL.md` |
| Append-only event record and replayability | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/commands/replay-readiness.md`, `.claude/skills/event-sourced-simulator/SKILL.md` |
| Agent observation and decision safety | `docs/AI_TRADING_ARENA_BLUEPRINT.md`, `.claude/skills/agent-decision-safety/SKILL.md`, `.claude/agents/simulator-safety-auditor.md` |
| Feed normalization before publish | `.claude/rules/public-feed-ingestion.md`, `.claude/skills/feed-adapter-hardening/SKILL.md` |
| Vitest and Playwright verification layers | `.claude/rules/testing-vitest-playwright.md`, `.claude/rules/fastify-testing-standards.md`, `.claude/output-styles/vitest-playwright-verifier.md` |
| Structural framework verification | `.claude/commands/structural-audit.md`, `.claude/workflows/arena-audit.js` |
| Hard runtime guardrails for risky tool actions | `.claude/settings.json`, `.claude/hooks/pre-tool-use.js`, `.claude/hooks/post-tool-use.js` |
| Scanner-backed security review criteria | `.claude/claude-security-guidance.md`, `.claude/security-patterns.json`, `.claude/workflows/arena-audit.js` |

## Onboarding, broker, and UX

| Blueprint concern | Framework evidence |
| --- | --- |
| OpenRouter onboarding and browser-safe secret handling | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/claude-security-guidance.md`, `.claude/security-patterns.json`, `.claude/rules/testing-vitest-playwright.md` |
| Paper broker mutations stay behind schema validation and risk gating | `AGENTS.md`, `CLAUDE.md`, `.claude/security-rules.md`, `.claude/skills/agent-decision-safety/SKILL.md`, `.claude/skills/event-sourced-simulator/SKILL.md` |
| Paper broker fills, balances, and P&L use deterministic Decimal-backed rules | `AGENTS.md`, `CLAUDE.md`, `.claude/skills/event-sourced-simulator/SKILL.md`, `.claude/rules/decimal-money-pnl.md`, `.claude/rules/testing-vitest-playwright.md` |
| Dashboard must expose live/replay state, reasoning surfaces, and charted telemetry | `AGENTS.md`, `CLAUDE.md`, `.claude/agents/dashboard-chart-auditor.md`, `.claude/rules/ui-data-visualization.md`, `.claude/rules/data-visualization-charts.md`, `.claude/rules/testing-vitest-playwright.md` |
| Trade thesis remains visible without storing hidden chain-of-thought | `.claude/agents/dashboard-chart-auditor.md`, `.claude/rules/fastify-realtime-api.md`, `.claude/rules/testing-vitest-playwright.md` |
| Telemetry ownership, correlation, and export-aware logging | `AGENTS.md`, `CLAUDE.md`, `.claude/rules/pino-logs.md`, `.claude/rules/opentelemetry-naming.md`, `.claude/rules/observability-resilience.md` |
| Export surfaces for replay and post-run forensics | `AGENTS.md`, `.claude/commands/replay-readiness.md`, `.claude/rules/decimal-money-pnl.md`, `.claude/rules/sqlite-drizzle-better-sqlite3.md` |

## Testing and delivery scope

| Blueprint concern | Framework evidence |
| --- | --- |
| Onboarding, dashboard, feed, retry, and validation flows require browser-visible verification | `.claude/rules/testing-vitest-playwright.md`, `.claude/rules/react-vite-tailwind.md`, `.claude/rules/ui-data-visualization.md` |
| Money/P&L, replay, feed adapters, and risk-related logic require deterministic unit/integration coverage | `AGENTS.md`, `.claude/commands/replay-readiness.md`, `.claude/rules/decimal-money-pnl.md`, `.claude/rules/public-feed-ingestion.md`, `.claude/rules/rate-limit-resilience.md`, `.claude/rules/testing-vitest-playwright.md` |
| Monorepo scripts and package boundaries stay aligned with the staged MVP build-out | `AGENTS.md`, `CLAUDE.md`, `.claude/rules/pnpm-typescript.md`, `.claude/rules/domain-contracts.md` |

## Explicitly indirect or future-growth blueprint surfaces

These blueprint details are not silent omissions. They are currently represented only indirectly or they still need dedicated Claude-native artifacts if the framework must enforce them more precisely.

| Blueprint surface | Current framework status |
| --- | --- |
| Blueprint implementation phases and phase-specific exit criteria | Not directly represented. The framework contains stack, audit, replay, and testing guidance, but there is no project-local command, workflow, or rule set that tracks phase-by-phase delivery gates from `docs/AI_TRADING_ARENA_BLUEPRINT.md`. |
| Concrete MVP scope choices such as two agents, one initial market, and the first complete loop priority | Indirect only. `CLAUDE.md` and the current skill/rule set support the loop components, but they do not encode the exact MVP package count, market count, or run-shape constraints as enforceable framework instructions. |

## Audit surfaces

| Audit need | Framework evidence |
| --- | --- |
| Blueprint alignment review | `.claude/commands/audit-blueprint-alignment.md` |
| Replay readiness review | `.claude/commands/replay-readiness.md` |
| Rule selection before edits | `.claude/commands/rule-coverage.md` |
| Hook registration and hook-script audit | `.claude/workflows/arena-audit.js`, `.claude/hooks/README.md` |
| Security-guidance surface audit | `.claude/workflows/arena-audit.js`, `.claude/claude-security-guidance.md`, `.claude/security-patterns.json` |
| Simulator safety review persona | `.claude/agents/simulator-safety-auditor.md` |
| Dashboard/chart review persona | `.claude/agents/dashboard-chart-auditor.md` |

## Gaps policy

If a future blueprint section has no direct framework evidence here, treat that as an audit finding and add the smallest Claude-native artifact that closes the gap.
