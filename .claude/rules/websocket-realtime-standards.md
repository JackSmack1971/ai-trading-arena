---
name: websocket-realtime-standards
description: Realtime WebSocket session, transport, and event-shape standards.
globs:
  - "src/**/*.{ts,js}"
  - "routes/**/*.{ts,js}"
  - "plugins/**/*.{ts,js}"
  - "ws/**/*.{ts,js}"
  - "websocket/**/*.{ts,js}"
  - "realtime/**/*.{ts,js}"
---
# WebSocket Realtime Standards
## Fastify WebSocket Routes
- Register @fastify/websocket before registering any route that declares websocket: true.
- Define WebSocket endpoints as GET routes with websocket: true and a handler signature of socket, request.
- Attach message, close, and error listeners synchronously inside the WebSocket route handler.
- Start async session or auth lookups as promises before listener registration, then await those promises inside message handlers.
- Add route params such as :roomId to model rooms, channels, tenants, or subscriptions in the Fastify route path.
- Keep each room or channel registry in a Map of key to Set of sockets and remove sockets from the Set on close.
- Delete empty room or channel entries immediately after the final socket leaves.
- Place wildcard WebSocket routes such as /* after named realtime routes and document their fallback scope in the module header.

## Connection Safety
- Configure @fastify/websocket options with an explicit maxPayload value for every public WebSocket service.
- Add a server heartbeat that marks sockets alive on pong, sends ping every 30000 ms, and terminates sockets that miss a cycle.
- Register socket error listeners that write structured errors through request.log or the service logger.
- Clear intervals, timers, subscriptions, and room membership in every socket close handler.
- Broadcast messages only to peers whose readyState equals WebSocket.OPEN.
- Exclude the sender socket from peer broadcasts unless the route contract states echo semantics.
- Send messages with a completion callback or readyState guard on paths that can race with close or connect transitions.
- Use createWebSocketStream for high-volume streaming flows and attach an error listener to the duplex stream.
- When perMessageDeflate is enabled, configure clientNoContextTakeover, serverNoContextTakeover, concurrencyLimit, and threshold in the server options.
