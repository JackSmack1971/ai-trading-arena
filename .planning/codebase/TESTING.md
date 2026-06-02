# Testing Strategy

**Analysis Date:** 2026-06-01

## Test Stack

**Runner:** Vitest (root `vitest.config.ts`)
- Plugin: `vite-tsconfig-paths` for path alias resolution
- Coverage provider: `v8`
- Coverage reporters: `text`, `lcov`
- `passWithNoTests: true` — packages with no tests do not fail CI

**Assertion library:** Vitest built-in `expect` (no separate chai/jest-extended)

**E2E framework:** None detected — no `e2e/` directory, no `playwright.config.*` file present. Playwright is prescribed by `testing-vitest-playwright.md` but not yet scaffolded.

**Run commands:**
```bash
pnpm vitest                        # watch mode (development)
pnpm vitest run                    # single run (CI)
pnpm vitest --coverage             # coverage report
pnpm --filter <package> vitest run # scoped to one package
```

## Test File Organization

**Location:** Co-located inside each package under `src/__tests__/`:
```
packages/broker-paper/src/__tests__/
packages/core/src/__tests__/
packages/db/src/__tests__/
packages/feeds/src/__tests__/
packages/strategies/src/__tests__/
apps/worker/src/__tests__/
```

**Naming:** `<module-name>.test.ts` matching the source file name exactly:
- `broker.test.ts` tests `broker.ts`
- `pnl.test.ts` tests `pnl.ts`
- `manifest.test.ts` tests `manifest.ts`

**Fixture files:** `__tests__/fixtures.ts` within the package — shared factory functions for the entire package test suite (e.g., `packages/strategies/src/__tests__/fixtures.ts`).

**Adversarial fixtures:** Strategy permission tests use real fixture strategy files under `packages/strategies/src/__tests__/fixtures/adversarial/`:
- `clean/strategy.ts` — valid strategy for baseline
- `fs-import/strategy.ts` — strategy attempting filesystem access
- `http-import/strategy.ts` — strategy attempting network access

## Fixture Patterns

**Factory functions (preferred pattern):**
```typescript
// packages/strategies/src/__tests__/fixtures.ts
export function makeBar(close: number, time: number): BarData { ... }
export function makePortfolio(agentId = 'agent-1'): PortfolioSummary { ... }
export function makeCtx(bars: BarData[], orderBook?: OrderBookSummary): StrategyContext { ... }
export function makeEvent(symbol = 'BTC-USD'): NormalizedMarketEvent { ... }
export function makeOrderBook(imbalance: string): OrderBookSummary { ... }
```

**Override pattern for broker tests:**
```typescript
function makeParams(overrides?: Partial<Parameters<PnLTracker['snapshot']>[0]>) {
  return { runId: RUN, agentId: AGENT, cashBalance: new MoneyDecimal('10000'), ..., ...overrides };
}
```

**Inline valid fixture objects for schema tests:**
```typescript
const validNoop: z.input<typeof AgentDecisionSchema> = {
  action: 'NOOP', confidence: 0.5, thesis: { ... }, risk: { maxLossUsd: '0' },
};
```

**Test database fixture (`packages/db/src/__tests__/events.test.ts`):**
- Uses `createMemoryDb()` from `@arena/db` for an in-memory SQLite database
- Migrations run via `drizzle-orm/better-sqlite3/migrator` against a resolved `drizzle/` folder path
- `beforeEach` / `afterEach` used for setup/teardown — each test gets a fresh DB instance

**WebSocket mock (`packages/feeds/src/__tests__/binance.test.ts`):**
```typescript
vi.mock('ws', () => {
  class MockWebSocket {
    static OPEN = 1;
    listeners: Record<string, MockListener[]> = {};
    on(event, cb) { ... }
    send = vi.fn(); close = vi.fn(); ping = vi.fn(); terminate = vi.fn();
  }
  return { WebSocket: MockWebSocket };
});
```
Fake timers used alongside: `vi.useFakeTimers()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`.

**Temp directory fixture (`apps/worker/src/__tests__/replay.test.ts`):**
```typescript
tmpPath = mkdtempSync(path.join(tmpdir(), 'arena-replay-'));
afterEach(() => rmSync(tmpPath, { recursive: true, force: true }));
```

## Coverage

**Unit tests — well covered:**
- `packages/broker-paper`: 7 test files covering `broker.ts`, `fee-model.ts`, `fills.ts`, `ledger.ts`, `pnl.ts`, `positions.ts`, `slippage-model.ts`
- `packages/core`: `domain.test.ts` covers all exported schemas, `MoneyDecimal`, rounding helpers, event types, `DefaultRiskConfig`, and `REAL_TRADING_ENABLED`
- `packages/strategies`: 8 test files covering `built-ins.ts`, `executor.ts`, `indicators.ts`, `loader.ts`, `manifest.ts`, `registry.ts`, `schemas.ts`, `signal-flow.ts`
- `packages/db`: `events.test.ts` covers append, replay, hash chain, projections, and batch operations
- `packages/feeds`: 3 test files covering Binance adapter, Coinbase adapter, and normalization

**Integration-level tests:**
- `apps/worker/src/__tests__/replay.test.ts` — end-to-end: creates real SQLite file, runs deterministic demo, validates hash chain and event type counts
- `apps/worker/src/__tests__/feed-to-db.test.ts` — feed-to-database pipeline

**What is tested per domain:**
| Area | Tests |
|------|-------|
| Zod schemas | Valid inputs, invalid inputs, boundary values, missing required fields |
| MoneyDecimal | Floating-point regression (`0.7 + 0.1`), rounding modes, negative P&L |
| PnLTracker | Return %, drawdown tracking, high-water mark, fee accumulation |
| PaperBroker | Market/limit order round-trips, fill prices, cash accounting, realized P&L |
| RiskGate | All 8 rules with pass and fail cases, Decimal-based boundary assertions |
| Strategy manifest | Valid YAML, invalid permissions (`network: true`, `can_emit_orders: true`), missing fields |
| Strategy loader | Adversarial strategies (filesystem/network imports) rejected |
| Feed adapters | WebSocket connect/subscribe, heartbeat, disconnect — via MockWebSocket + fake timers |
| DB event store | Append, replay, hash chain integrity, projections |
| Replay CLI | Full deterministic loop producing expected event type counts |

## Notable Test Files

- `packages/core/src/__tests__/domain.test.ts` — canonical integration-level schema smoke test; validates 20 event types, `DefaultRiskConfig`, and `REAL_TRADING_ENABLED === false`
- `packages/broker-paper/src/__tests__/broker.test.ts` — comprehensive round-trip tests with exact Decimal string assertions for cash, P&L, and fill prices
- `packages/broker-paper/src/__tests__/pnl.test.ts` — includes the mandatory `0.7 + 0.1` floating-point regression test
- `packages/strategies/src/__tests__/manifest.test.ts` — permission boundary tests including adversarial YAML inputs and `validateManifestInputs` with Zod schema
- `packages/db/src/__tests__/events.test.ts` — hash chain construction, batch append, `verifyHashChain`, and projection helpers
- `apps/worker/src/__tests__/replay.test.ts` — only integration test that touches real filesystem and SQLite; validates full demo telemetry loop

## Gaps

**No Playwright / E2E tests:** The `e2e/` directory does not exist. Dashboard flows, WebSocket streaming through the UI, chart rendering, and browser-visible validation states are entirely untested.

**`apps/api/` has no tests:** `apps/api/src/index.ts` contains the HTTP server, WebSocket telemetry broadcaster, demo seeding logic, and `buildTelemetry`. There are no `fastify.inject` or HTTP fixture tests for any route.

**`apps/web/` has no tests:** The React frontend (`apps/web/src/index.ts`) has no Vitest component tests or Playwright visual tests.

**`packages/agents/` has no tests:** `packages/agents/src/index.ts` is untested — agent decision logic and `createDemoPaperAgents` have no unit coverage.

**Feed adapter coverage is shallow:** `packages/feeds/src/__tests__/binance.test.ts` and `coinbase.test.ts` test basic connect/subscribe but do not cover heartbeat failure/terminate, backpressure drop, retry exhaustion, or malformed payload rejection paths.

**Rate-limiter coverage absent:** `packages/feeds/src/limiters.ts` and `packages/feeds/src/rate-limiter.ts` have no dedicated tests — Bottleneck scheduler behavior, reservoir refresh, and p-retry classification are not verified.

**No OpenRouter/LLM tests:** Agent decision flow through OpenRouter is not tested — no mock SDK, no retry classification tests, no structured output parse tests.

**Coverage thresholds not enforced:** `vitest.config.ts` defines `coverage.provider` and reporters but sets no `thresholds` block. Uncovered paths do not fail CI.

---

*Testing analysis: 2026-06-01*
