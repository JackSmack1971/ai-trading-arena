---
name: openrouter-sdk
description: OpenRouter SDK integration standards for model access and provider routing.
globs:
  - "apps/api/**/*.{ts,tsx}"
  - "packages/ai/**/*.ts"
  - "packages/openrouter/**/*.ts"
  - "packages/shared/**/*.ts"
  - "src/**/*.{ts,tsx}"
---
# OpenRouter SDK Integration
## Client Construction
- [C7: OpenRouter] Initialize the OpenAI SDK with `baseURL: "https://openrouter.ai/api/v1"` and `apiKey` loaded from `OPENROUTER_API_KEY`.
- [C7: OpenRouter] Set `HTTP-Referer` and `X-OpenRouter-Title` through `defaultHeaders` when project env config provides site attribution values.
- [C7: OpenAI Node] Configure SDK request options at the client or request boundary, including `timeout` in milliseconds and `maxRetries` for transient failures.
- [scope: backend] Keep OpenRouter client factories inside server packages, Fastify plugins, worker jobs, or CLI utilities.
- [scope: backend] Validate configured provider/model identifiers with Zod before passing them to the SDK, and prefer IDs sourced from the current OpenRouter model list rather than hardcoded example values.

## Request Contracts
- [C7: OpenAI Node] Use `client.chat.completions.create()` for OpenRouter-compatible chat requests with explicit `model` and `messages` fields.
- [C7: OpenAI Node] Use `client.chat.completions.parse()` with `zodResponseFormat()` for domain DTOs that are represented as Zod schemas.
- [C7: OpenRouter] Use JSON Schema structured output with `type: "json_schema"`, `strict: true`, and `additionalProperties: false` for provider-agnostic responses.
- [scope: shared] Parse every model result through shared Zod schemas before database writes, agent decisions, WebSocket broadcasts, or chart state updates.
- [tool: Pino] Log model id, route, latency, retry count, request id, and finish reason as structured fields with prompt and completion content represented by hashes or explicit debug toggles.

## Resilience and Observability
- [tool: p-retry] Route OpenRouter calls through a retry wrapper that records attempt number, retry reason, and final failure class.
- [tool: Bottleneck] Apply limiter keys by model and workflow so feed-driven analysis and user-triggered requests share configured concurrency controls.
- [tool: OpenTelemetry] Create spans named `llm.openrouter.chat` with attributes for `llm.provider`, `llm.model`, `http.route`, `retry.count`, and `request.id`.
