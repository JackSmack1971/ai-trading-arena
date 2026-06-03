---
name: context7-usage
description: Current-library-documentation workflow rules for framework, SDK, API, CLI, and cloud-service work.
paths:
  - "CLAUDE.md"
  - "AGENTS.md"
  - ".claude/**/*.md"
  - "docs/**/*.md"
---

**Context7 MCP (Model Context Protocol)** is an open JSON-RPC protocol + server (provided by Upstash/Context7) that equips AI agents and coding tools with native, real-time access to fresh library/framework documentation and code examples. It solves stale training-data problems by letting agents dynamically discover and query docs without manual web searches or outdated knowledge.

### How an AI agent uses it (via connected services or MCP server)

The agent registers the MCP server (`https://mcp.context7.com/mcp` + API key) as a tool provider. Once connected, the agent interacts through standardized MCP commands. Context7 specifically exposes two core tools:

1. **resolve-library-id**

   - **Purpose**: Convert a library name into a precise Context7 library ID such as `/vercel/next.js`.
   - **Inputs**: library name plus the actual task context for ranking.
   - **Output**: Ranked candidate IDs with metadata such as description, snippet count, reputation, benchmark score, and versions.
   - **Rule**: Call this first unless the user already provided an exact `/org/project` or `/org/project/version` ID.

2. **query-docs**

   - **Purpose**: Fetch targeted docs and code snippets for the resolved library.
   - **Inputs**: the exact library ID plus the full user question.
   - **Output**: Relevant documentation excerpts and examples.
   - **Rule**: Use the full task question, not one-word queries, and never include secrets.

### Standard workflow

1. Resolve the library ID.
2. Query docs with the real task.
3. Ground rule updates, code snippets, and implementation guidance in the returned docs.
4. Prefer Context7 over generic web search for supported libraries, frameworks, SDKs, CLIs, and cloud services.
