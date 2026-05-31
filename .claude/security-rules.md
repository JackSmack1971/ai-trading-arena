# Security Rules

## Product boundary

- This framework is for local simulation, replay, and analysis only.
- Do not add live-trading execution adapters, wallet signing, custody logic, or automated fund movement.
- Any future broker integration proposal must stay outside this repository until the product boundary is explicitly changed.

## Secret handling

- Keep `OPENROUTER_API_KEY` and other secrets in environment variables or encrypted local storage.
- Never return decrypted secrets to the browser.
- Never include raw secrets in logs, traces, screenshots, fixtures, exported JSONL, or failing test output.

## Decision safety

- Parse every agent decision through a shared schema before it touches persistence, telemetry, WebSocket broadcasts, or the paper broker.
- Invalid or unrepairable model output becomes `NOOP` plus a structured audit event.
- Risk-gate rejections are terminal for the attempted action and must be logged with the rejected payload and reason.

## Replay and evidence

- Use append-only event records for simulator state transitions.
- Do not mutate or backfill historical event rows without an explicit migration or evidence-preserving repair path.
- Preserve timestamps, run IDs, agent IDs, strategy IDs, and correlation IDs across logs, traces, and event records.
