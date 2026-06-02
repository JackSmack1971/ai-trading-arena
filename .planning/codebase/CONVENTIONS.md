# Code Conventions

**Analysis Date:** 2026-06-01

## Naming

**Files:**
- Source modules: `kebab-case.ts` (e.g., `fee-model.ts`, `risk-gate.ts`, `slippage-model.ts`)
- Test files: `__tests__/<module-name>.test.ts` — co-located inside the package under `src/__tests__/`
- Fixture helpers: `__tests__/fixtures.ts` (shared within a package's test suite)
- Logger modules: `logger.ts` per package (e.g., `packages/feeds/src/logger.ts`, `packages/strategies/src/logger.ts`)
- Money module: always `money/decimal.ts` within a package

**Classes:**
- PascalCase: `PaperBroker`, `PaperRiskGate`, `PnLTracker`, `CashLedger`, `PositionTracker`, `StrategyExecutor`
- Error classes: PascalCase with `Error` suffix — `SignalValidationError`, `ManifestValidationError`

**Interfaces:**
- PascalCase: `BrokerConfig`, `RiskGateContext`, `WorkerOptions`, `ApiServerOptions`
- Discriminated union types use a `type` literal field: `BrokerEventPayload`, `RiskGateDecision`

**Variables:**
- camelCase throughout: `runId`, `agentId`, `startingBalance`, `unrealizedPnl`, `realizedPnl`
- P&L naming convention: always prefix/suffix with `unrealizedPnl` / `realizedPnl` — never abbreviated
- Module-level constants: UPPER_SNAKE_CASE (`ZERO_MONEY`, `MONEY_SCALE_USD`, `DEFAULT_HISTORY_LIMIT`, `REAL_TRADING_ENABLED`)
- Test constants: short ALL_CAPS at file scope (`RUN`, `AGENT`, `TS`, `T1`–`T5`)

**Schemas (Zod):**
- Always `PascalCase` with `Schema` suffix: `AgentDecisionSchema`, `DecimalStringSchema`, `RiskEventSchema`
- Derived types exported alongside schema with matching name (no suffix): `type AgentDecision = z.infer<typeof AgentDecisionSchema>`

## TypeScript Patterns

**Strict mode:** Enabled across all packages. `verbatimModuleSyntax: true` in use.

**Module resolution:**
- Backend packages: `NodeNext` / `NodeNext` — all local imports use `.js` extension (e.g., `'./money/decimal.js'`)
- Frontend: `Bundler` / `ESNext`

**Type imports:**
- `import type { ... }` enforced via ESLint rule `@typescript-eslint/consistent-type-imports: "error"`
- Unused vars: `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_" }]`
- Explicit any: warned (`"warn"`) — not banned outright

**`readonly` on class fields:**
- All injected dependencies and config fields declared `private readonly`: `private readonly ledger: CashLedger`
- Mutable state is not `readonly` (e.g., `private totalFeesPaid: MoneyDecimal`)

**Cross-package imports:**
- Workspace packages imported by name: `import { ... } from '@arena/core'` — never relative paths across package roots
- Vitest config provides path aliases: `@arena/core`, `@arena/db`, `@arena/feeds`

**Discriminated unions for domain events:**
```typescript
export type BrokerEventPayload =
  | { type: 'PAPER_ORDER_CREATED'; order: PaperOrder }
  | { type: 'PAPER_ORDER_FILLED'; fill: PaperFill; order: PaperOrder }
  | { type: 'RISK_CHECK_REJECTED'; riskEvent: RiskEvent };
```

## Zod Usage

**Schema location:**
- Shared domain schemas: `packages/core/src/schemas/*.ts` — split by domain (`agent.ts`, `broker.ts`, `common.ts`, `market.ts`, `risk.ts`, `strategy.ts`, `instrument.ts`)
- Package-local schemas: `src/schemas.ts` within the package (e.g., `packages/strategies/src/schemas.ts`)
- All schemas exported from the package `index.ts` barrel

**Schema naming rule:** `<Domain><Concept>Schema` — e.g., `AgentDecisionSchema`, `NonNegativeDecimalStringSchema`, `StrategyManifestSchema`

**Type export pattern (always paired):**
```typescript
export const AgentDecisionSchema = z.object({ ... });
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
```

**Boundary usage:**
- `schema.parse(value)` — trusted server boundaries (startup paths, demo seeding) where an exception should stop the flow
- `schema.safeParse(value)` — user-facing, batch, test-fixture, and validation-heavy boundaries

**Composition patterns:**
- `z.enum([...])` for discriminated string types (`AgentActionNameSchema`, `SimEventTypeSchema`)
- `z.refine()` for domain constraints built on top of base schemas:
  ```typescript
  export const NonNegativeDecimalStringSchema = DecimalStringSchema.refine(
    (val) => !val.startsWith('-'),
    'Must be a non-negative decimal number string',
  );
  ```
- `z.array(...).max(N)` used on arrays with known upper bounds (e.g., `openOrders: z.array(...).max(50)`)
- `z.string().datetime()` enforced for all timestamps via `TimestampSchema`

**Common primitive schemas (`packages/core/src/schemas/common.ts`):**
- `DecimalStringSchema` — regex-validated decimal string, no scientific notation
- `NonNegativeDecimalStringSchema` — refine of above requiring `>= 0`
- `PositiveDecimalStringSchema` — refine of above requiring `> 0`
- `TimestampSchema` — `z.string().datetime()` (ISO-8601 UTC enforced)
- `RunIdSchema`, `AgentIdSchema`, `OrderIdSchema`, etc. — `z.string().min(1)` with message

## Decimal.js Money Handling

**Single authoritative constructor:**
`MoneyDecimal` is defined once in `packages/core/src/money/decimal.ts` and re-exported by `packages/broker-paper/src/money/decimal.ts`. No other `Decimal.clone()` call exists in the workspace.

**Configuration:**
```typescript
export const MoneyDecimal = Decimal.clone({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -28,
  toExpPos: 28,
});
export const ZERO_MONEY = new MoneyDecimal('0');
export const MONEY_SCALE_USD = 2;
export const MONEY_SCALE_CRYPTO = 8;
```

**Construction rule:** Always from strings or existing `MoneyDecimal` instances. Never from JS `number`.
```typescript
const requested = new MoneyDecimal(ctx.request.quantityUsd);   // from validated string
const equity = new MoneyDecimal(ctx.portfolio.equity);          // from DB/serialized string
```

**Arithmetic:** All via Decimal methods (`.plus`, `.minus`, `.times`, `.div`, `.abs`). Results always reassigned or returned — instances are immutable.

**Rounding boundary helpers (`packages/core/src/money/decimal.ts`):**
- `roundForLedger(value, scale)` — returns `MoneyDecimal` (for continued arithmetic)
- `roundForDisplay(value, scale)` — returns `string` (for UI/logs)
- `roundForSettlement(value, scale)` — returns `string` (for DB/serialization)

**Serialization:** Money values stored and transmitted as decimal strings (`equity.toString()`). Never serialized as JS `number`.

**P&L naming:** Variables always use `unrealizedPnl` / `realizedPnl` prefixes in both code and Zod schemas.

## Error Handling

**Typed error classes:**
- Domain errors extend `Error` with PascalCase + `Error` suffix: `SignalValidationError`, `ManifestValidationError`
- Error classes carry typed structured fields (e.g., `public readonly issues: string[]`, `public readonly strategyId: string`)
- `name` property explicitly set in constructor body

**Risk gate pattern (typed result union, no throws):**
```typescript
export type RiskGateDecision =
  | { decision: 'PASSED'; event: RiskEvent }
  | { decision: 'REJECTED'; event: RiskEvent };
```
`PaperRiskGate` never throws — callers switch on the `decision` field.

**Broker events (discriminated union, no throws):**
Rejections flow as typed `BrokerEventPayload` events (`PAPER_ORDER_REJECTED`, `RISK_CHECK_REJECTED`) through the `onEvent` callback rather than thrown exceptions.

**HTTP error handling (`apps/api/src/index.ts`):**
```typescript
void handleHttp(req, res, db).catch((err: unknown) => {
  logger.error({ err }, 'http request failed');
  sendJson(res, 500, { error: 'internal_error' });
});
```
- 404 responses: `sendJson(res, 404, { error: 'not_found' })`

**Zod parse failures:**
- `safeParse` used at validation boundaries; issue paths surfaced in typed error class fields (`ManifestValidationError.issues`)
- `parse` used where failure should terminate the path (demo seeding, schema-validated tick construction)

## Logging

**Pattern:** One named Pino root logger per package/app entry, derived with `pino({ name: '<package>' })`.

**Logger modules:**
- `packages/feeds/src/logger.ts`: `export const feedLogger = pino({ name: 'feeds' })`
- `packages/strategies/src/logger.ts`: `export const strategyLogger = pino({ name: 'strategies' })`
- `apps/api/src/index.ts`: `const logger = pino({ name: 'api' })` (module-scoped, not exported)
- `apps/worker/src/index.ts`: `const logger = pino({ name: 'worker' })`

**Call style:** Structured object first, stable message string second:
```typescript
logger.error({ err }, 'http request failed');
logger.warn({ err, runId }, 'telemetry websocket error');
logger.warn({ bufferedAmount: ws.bufferedAmount }, 'dropping telemetry frame due to websocket backpressure');
logger.info({ port, host }, 'arena api listening');
```

**Levels in use:**
- `info` — server lifecycle events, listening confirmation
- `warn` — recoverable issues (WebSocket backpressure, socket errors)
- `error` — request failures, always with `err` field

**Note:** Redact path configuration (`req.headers.authorization`, API keys, prompt content) is prescribed in `pino-logs.md` but not yet wired into the current Pino constructors.

---

*Convention analysis: 2026-06-01*
