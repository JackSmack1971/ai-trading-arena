# Security Guidance

Use this project guidance when reviewing edits for security issues in the AI Trading Arena framework.

## Highest-priority findings

- Any path that introduces real trade execution, broker account access, exchange private endpoints, wallet signing, custody flows, withdrawals, deposits, or automated fund movement.
- Any browser-visible handling of `OPENROUTER_API_KEY` or other secrets, including `localStorage`, `sessionStorage`, query params, logs, screenshots, fixtures, exports, or test snapshots.
- Any edit that weakens schema validation before the risk gate, bypasses the risk gate, or lets malformed agent output mutate paper-broker or persistence state.
- Any design that weakens append-only event evidence, replay determinism, correlation IDs, or audit logging for state-changing simulator actions.

## Review heuristics

- Treat OpenRouter, broker, exchange, wallet, and secret-handling changes as high scrutiny areas even if the diff appears small.
- Flag any code or guidance that mixes public market-data reads with private trading/account endpoints.
- Flag any UI or DX flow that recommends storing secrets in browser storage or printing them back to the user after save.
- Flag edits that move authoritative state into the browser without append-only server-side evidence.

## Safe expectations

- Public feed adapters should stay no-auth unless the product boundary explicitly changes.
- Agent decisions should remain schema-validated, repair-bounded, and reduced to `NOOP` on invalid output.
- Secret material should stay in environment variables, encrypted local storage, or OS credential stores, never browser storage.
- Hard blocks belong in hooks or CI; this file supplies review criteria, not runtime enforcement by itself.
