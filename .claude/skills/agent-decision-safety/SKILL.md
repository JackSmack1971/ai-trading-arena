---
name: agent-decision-safety
description: Use when changing prompts, OpenRouter clients, decision schemas, repair logic, or risk-gate integration.
---

# Agent Decision Safety

Use this skill when a task changes agent observation packets, model requests, structured output schemas, parsing, retries, or risk-gate handoff.

## Workflow

1. Read `docs/AI_TRADING_ARENA_BLUEPRINT.md` sections for agent inputs, outputs, permissions, and invalid-decision handling.
2. Read `.claude/rules/openrouter-sdk.md`, `.claude/rules/openai-openrouter.md`, `.claude/rules/zod-*.md`, and `.claude/rules/rate-limit-*.md`.
3. Confirm the request/response contract is typed and validated end to end.
4. Confirm malformed or unsafe model output degrades to `NOOP` with audit evidence.
5. Confirm retries, logging, and traces preserve request IDs, model IDs, and failure classes without leaking prompt secrets.

## Output

- Decision surface changed
- Schema and validation boundary
- Failure mode
- Risk-gate impact
- Required verification
