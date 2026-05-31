---
name: zod-files-realtime-tests
description: Zod schema standards for files, realtime payloads, and tests.
globs:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "tests/**/*.{ts,tsx}"
  - "src/**/__tests__/**/*.{ts,tsx}"
  - "src/uploads/**/*.{ts,tsx}"
  - "src/ws/**/*.{ts,tsx}"
  - "src/websocket/**/*.{ts,tsx}"
  - "packages/*/test/**/*.{ts,tsx}"
---
# Zod Files Realtime and Tests
## Upload and Realtime Inputs
- Validate file metadata with a Zod schema before reading file contents, storing blobs, or creating database records.
- Validate parsed CSV, JSON, and multipart payload records with `safeParse` so each rejected row reports its own issue path.
- Validate WebSocket, Server-Sent Event, and queue messages with a discriminated union keyed by message type.
- Parse inbound realtime messages before dispatching to handlers and parse outbound messages before broadcasting to clients.
- Represent upload limits with schema constraints for MIME family, byte size, extension, and record count where those values are known locally.
- Return structured validation summaries for batch imports with accepted count, rejected count, and per-record issues.

## Fixtures and Contract Tests
- Build test fixtures with schema factories that return values accepted by `Schema.parse`.
- Add negative validation tests for each public schema that accepts user, file, realtime, environment, or third-party input.
- Assert `safeParse` success branches in tests before fixtures are passed to handlers, components, or database helpers.
- Assert failure issue paths for at least 1 required field and 1 type mismatch on each public request schema.
- Snapshot normalized parsed output for schemas that strip unknown keys, transform values, or apply defaults.
- Run schema contract tests in CI for every package that exports schemas consumed by another package.
