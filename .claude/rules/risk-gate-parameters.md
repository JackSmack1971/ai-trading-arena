---
name: risk-gate-parameters
description: Deterministic risk-gate parameter and rejection standards for simulator order and exposure control.
paths:
  - "apps/api/**/*.{ts,tsx,js,jsx}"
  - "apps/worker/**/*.{ts,tsx,js,jsx}"
  - "packages/core/**/*.{ts,tsx,js,jsx}"
  - "packages/agents/**/*.{ts,tsx,js,jsx}"
  - "packages/broker-paper/**/*.{ts,tsx,js,jsx}"
  - "tests/**/*.{ts,tsx,js,jsx}"
---
# Risk Gate Parameters
## Scope
- Apply these rules to risk-gate modules, policy evaluators, simulator orchestration code, order-intent reducers, and tests that approve or reject state-changing simulator actions.
- Treat the risk gate as deterministic, non-AI, and final for every action that could mutate orders, positions, balances, or strategy state.

## Required Controls
- Enforce a maximum position size rule before any paper-order creation or amendment reaches the broker layer.
- Enforce maximum symbol exposure and maximum total exposure rules using the same Decimal-based value model as portfolio and P&L calculations.
- Enforce maximum drawdown rules with explicit measurement windows and stable comparison inputs.
- Enforce maximum order-count-per-minute and maximum strategy-switches-per-hour rules with deterministic counters keyed by run ID and agent ID.
- Keep negative cash disallowed unless a separately named simulator mode explicitly enables margin behavior.
- Keep leverage disabled in the MVP and reject strategy, agent, or API requests that imply leveraged exposure.
- Keep real-execution requests rejected categorically inside the same risk boundary rather than delegating them to downstream code.

## Rejection Semantics
- Represent every rejection as a typed risk event with the attempted action, rejected payload, rule identifier, threshold, observed value, and reason string.
- Make risk-gate rejection terminal for the attempted action; do not let retry wrappers, strategy loaders, or model-repair paths silently bypass the rejected state transition.
- Preserve risk rejection evidence in replayable event records, logs, traces, and dashboard-visible reasoning surfaces.
- Keep risk-rule identifiers stable so post-run forensics can aggregate rejections by rule and threshold.

## Runtime Discipline
- Evaluate risk after schema validation and before paper-broker mutation, persistence writes, or outward WebSocket broadcast of an accepted action.
- Keep risk-parameter configuration in one typed source of truth rather than duplicating thresholds across API, worker, UI, tests, or prompts.
- Require strategy-switch limits to operate on the same canonical strategy IDs used by strategy manifests, telemetry, and replay evidence.
- Reject any design that lets prompts, strategy packs, or UI clients disable risk checks, mutate thresholds ad hoc, or write directly past the gate.

## Verification
- Add tests for each gate with passing and failing cases covering position size, exposure, drawdown, order frequency, strategy-switch frequency, negative cash, and leverage attempts.
- Cover boundary values with exact Decimal-based assertions rather than floating-point approximations.
- Verify replay and export surfaces preserve the rejected payload, threshold, observed value, and rule ID for every risk event.
