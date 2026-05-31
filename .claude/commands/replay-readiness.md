---
description: Review deterministic replay, event evidence, and forensic readiness.
argument-hint: "[scope]"
allowed-tools: [Read, Bash]
---

Review whether the current design can support deterministic replay and post-run forensics.

1. Inspect event models, persistence plans, telemetry exports, and dashboard reasoning views.
2. Confirm every state-changing simulator action can be traced from feed input to strategy signal to agent decision to risk result to paper-broker mutation.
3. Flag any design that would require hidden mutable state, lossy logs, or browser-only copies of authoritative data.
4. Report missing event IDs, timestamps, agent IDs, strategy IDs, correlation IDs, or export surfaces as actionable findings.
