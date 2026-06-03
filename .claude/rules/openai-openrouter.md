---
name: openai-openrouter
description: OpenAI Node SDK usage standards when routed through OpenRouter.
paths:
  - "apps/**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "packages/**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "src/**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "tests/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---

# OpenAI SDK Through OpenRouter
## Client Configuration
- Initialize the `openai` Node SDK through a single shared client factory per application runtime.
- Set `baseURL` exactly to `https://openrouter.ai/api/v1` for OpenRouter-backed clients.
- Read the provider key from `process.env.OPENROUTER_API_KEY` at the configuration boundary.
- Configure `timeout` and `maxRetries` explicitly in the client factory using project constants.
- Add `HTTP-Referer` and `X-OpenRouter-Title` through `defaultHeaders` when the project has public site metadata.

## Request Construction
- Use OpenRouter model identifiers such as `openai/gpt-5.2`, `~openai/gpt-latest`, or `openrouter/free` exactly as model strings.
- Use `client.chat.completions.create` for OpenRouter-compatible text generation requests.
- Pass alternate model fallbacks through the OpenRouter `models` request field or SDK `extra_body` equivalent when routing resilience is required.
- Include `stream: true` only when the caller consumes Server-Sent Events incrementally.
- Attach a `session_id` of 256 characters or fewer for multi-turn agent workflows that need request grouping.

## Observability
- Record model, routed model when present, status code, latency milliseconds, retry count, and `usage.total_tokens` for every completed call.
- Record `usage.prompt_tokens` and `usage.completion_tokens` whenever OpenRouter returns usage data.
- Use structured logger fields for request metadata and redact prompt text, response text, API keys, and authorization headers.

## Error Handling
- Classify OpenRouter HTTP failures into 400 request validation, 401 authentication, 429 rate limit, and 500 provider/server categories.
- Return typed application errors from the SDK boundary with provider, model, status code, and retryability fields.
- Apply bounded retry policy only to retryable transport, rate-limit, and server-side failures.
