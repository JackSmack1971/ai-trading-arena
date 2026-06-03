---
name: fastify-api-standards
description: Fastify HTTP API implementation and plugin-structure standards.
paths:
  - "src/**/*.{ts,js}"
  - "app/**/*.{ts,js}"
  - "server/**/*.{ts,js}"
  - "routes/**/*.{ts,js}"
  - "plugins/**/*.{ts,js}"
---
# Fastify API Standards
## Plugin Architecture
- Implement each plugin with one completion style: async plugin with awaited setup or callback plugin ending in done().
- Wrap decorators shared outside their encapsulated plugin with fastify-plugin and set both name and fastify version metadata.
- Register feature routes inside encapsulated plugins so decorations, hooks, and prefixes remain scoped to that feature.
- Use function handlers for hooks and routes that access Fastify context through this.

## Routes and Schemas
- Define every route through fastify.get, fastify.post, or fastify.route with method, url, schema, and handler visible in the route module.
- Add JSON Schema validation for each accepted params, querystring, body, and headers object on routes that read those inputs.
- Add response schemas for success and error payloads on externally reachable HTTP routes.
- Place authentication and authorization checks in preValidation or preHandler hooks on the route or encapsulating plugin.
- Read validated request data from request.params, request.query, request.body, and request.headers according to the route generic or schema contract.

## Errors and Logging
- Log startup failures with fastify.log.error before exiting the process with status code 1.
- Use request.log for request-scoped operational events inside handlers, hooks, and WebSocket upgrade paths.
- Return thrown errors from hooks or handlers through Fastify's error pipeline instead of ad hoc response mutation.
