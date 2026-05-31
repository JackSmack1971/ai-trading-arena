# Codebase Concerns

**Analysis Date:** 2026-05-31

## Tech Debt

**Empty Application and Package Skeletons:**
- Issue: Several packages and applications exist only as directories with a boilerplate `export {};` inside their index files.
- Files: `packages/agents/`, `packages/feeds/`, `packages/telemetry/`, `packages/ui/`, `apps/api/`, `apps/web/`, `apps/worker/`.
- Why: Monorepo layout scaffolded before implementing active phase logic.
- Impact: The framework cannot run in a live or integrated simulation state today.
- Fix approach: Implement core Fastify, React, Worker loop, and Feed adapters incrementally in subsequent project phases.

## Known Bugs

- None detected. Basic logic packages (`packages/core`, `packages/broker-paper`, `packages/strategies`, `packages/db`) have passing Vitest suites.

## Security Considerations

**Broker and Wallet Safety Invariant:**
- Risk: Inadvertent introduction of brokerage or real trading adapters.
- Files: `packages/core/src/constants.ts` (`REAL_TRADING_ENABLED` hardcoded to `false`), `packages/core/src/schemas/risk.ts`.
- Current mitigation: Strictly local simulators. The non-negotiable architectural invariant prohibits any real exchange, brokerage, or crypto wallet integration.
- Recommendations: Maintain strict continuous integration rules to audit any dependencies representing broker clients (e.g., CCXT, brokerage SDKs).

**Secret Injection Exposure:**
- Risk: OpenRouter API keys or LLM endpoint credentials leaked in logs or pushed to version control.
- Files: `.env.example`
- Current mitigation: Environment variables used for credentials. `.env` is gitignored.
- Recommendations: Ensure that the logging layer (`packages/telemetry`) scrubs headers like `Authorization` and keys starting with `sk-` from log payloads.

## Performance Bottlenecks

**SQLite Database File Size under Active Load:**
- Problem: Event-sourced simulations write every micro-market tick as a database row.
- Files: `packages/db/src/schema.ts`
- Cause: Append-only design causes database size to grow linearly with the duration of the simulation run.
- Improvement path: Implement database snapshotting/pruning strategies or limit the scope/depth of simulated ticks to keep runs light.

## Test Coverage Gaps

**Skeleton Packages Lacking Tests:**
- What's not tested: Integrations, agent deciders, and network feeders are currently untestable as they are empty.
- Files: `packages/agents/`, `packages/feeds/`, `packages/telemetry/`, `packages/ui/`, `apps/api/`, `apps/web/`, `apps/worker/`.
- Risk: High probability of introducing bugs when these skeletons are populated without continuous test verification.
- Priority: High (as development begins in these areas).

---

*Concerns audit: 2026-05-31*
*Update as issues are fixed or new ones discovered*
