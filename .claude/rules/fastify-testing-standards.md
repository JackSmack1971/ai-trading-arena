---
name: fastify-testing-standards
description: Fastify route, plugin, and transport testing standards.
globs:
  - "**/*.test.{ts,js}"
  - "**/*.spec.{ts,js}"
  - "test/**/*.{ts,js}"
  - "tests/**/*.{ts,js}"
  - "src/**/*.test.{ts,js}"
  - "src/**/*.spec.{ts,js}"
---
# Fastify Testing Standards
## Application Test Shape
- Export a build function that returns a configured Fastify instance separately from the server listen entrypoint.
- Instantiate the app inside each test file through the build function with test-specific options.
- Prefer fastify.inject for HTTP route tests that can run without a bound network port.
- Use fastify.inject requests with explicit method, url, and relevant query, payload, headers, or cookies fields.
- Assert response statusCode, content-type, and parsed JSON body for each public route contract.
- Register t.after or the equivalent test cleanup hook to call fastify.close for every app created in a test.

## Plugin and Realtime Tests
- Test Fastify plugins by registering the plugin into a fresh Fastify instance inside the test.
- Exercise plugin decorators through a test route and assert decorated request and instance values through route output.
- Use t.plan or an equivalent assertion count when callbacks, socket events, or async listeners participate in the test.
- Use fastify.ready before tests that exercise the underlying server instance through fetch, undici, or supertest.
- Close HTTP clients, WebSocket clients, and Fastify instances in the same cleanup hook that created them.
- Cover each WebSocket route with connection, message, close, and error-path assertions at the route boundary.
