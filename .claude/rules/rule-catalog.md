---
name: rule-catalog
description: Rule-selection index defining precedence and the smallest relevant rule set before editing.
globs:
  - "CLAUDE.md"
  - "AGENTS.md"
  - ".claude/**/*.md"
---

# Rule Catalog

Use this file to choose the smallest relevant rule set before editing.

## Precedence

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.claude/security-rules.md`
4. Path-scoped `.claude/rules/*.md`
5. Commands, skills, agents, and output styles selected for the task

When two rules overlap, prefer the more path-specific and more concrete rule.

## Rule groups

### Repository and shared architecture

- `context7-usage.md`
- `pnpm-typescript.md`
- `domain-contracts.md`
- `decimal-money-pnl.md`
- `risk-gate-parameters.md`
- `strategy-pack-permissions.md`
- `zod-core-contracts.md`
- `zod-data-env-monorepo.md`

### API, realtime, and backend

- `api-fastify-websocket.md`
- `fastify-api-standards.md`
- `fastify-realtime-api.md`
- `websocket-realtime-standards.md`
- `sqlite-drizzle-better-sqlite3.md`
- `openai-openrouter.md`
- `openrouter-sdk.md`
- `pino-logs.md`
- `opentelemetry-naming.md`
- `observability-resilience.md`

### Feed ingestion and rate limits

- `public-feed-ingestion.md`
- `public-feeds-ws-undici.md`
- `rate-limits-bottleneck-pretry.md`
- `rate-limit-resilience.md`
- `rate-limit-tests.md`

### Frontend and visualization

- `react-vite-tailwind.md`
- `ui-data-visualization.md`
- `data-visualization-charts.md`
- `zod-frontend-forms-query.md`

### Verification

- `testing-vitest-playwright.md`
- `fastify-testing-standards.md`
- `zod-files-realtime-tests.md`
- `zod-api-contracts.md`

## Removed duplicates

The framework intentionally does not use thin generic rules such as `charting.md`, `pino-logging.md`, or `testing.md`. Their guidance was absorbed by more specific path-scoped rules to reduce ambiguity.
