// packages/telemetry/src/naming.ts
// OpenTelemetry naming constants — string constants only, no SDK bootstrap.
// Consumers import these to avoid magic strings in instrumented code.
// Per D-02: no NodeSDK, no OTLP exporter in Phase 1.

/** Span name builders and static names for HTTP, WebSocket, DB, Feed, and LLM operations. */
export const SPAN_NAMES = {
  /** HTTP server route: pass method and templated route, e.g. 'GET /v1/agents/:agentId' */
  HTTP_SERVER: (method: string, route: string): string => `${method} ${route}`,

  /** WebSocket inbound channel */
  WS_RECEIVE: (channel: string): string => `WS RECEIVE ${channel}`,

  /** WebSocket outbound channel */
  WS_SEND: (channel: string): string => `WS SEND ${channel}`,

  /** Database single-table operation */
  DB_TABLE: (operation: string, table: string): string => `${operation} ${table}`,

  /** Database cross-table or multi-table operation */
  DB_MULTI: (operation: string): string => `${operation} sqlite`,

  // Feed static names
  FEED_SUBSCRIBE: 'feed.subscribe',
  FEED_RECONNECT: 'feed.reconnect',
  FEED_FETCH: 'feed.fetch',
  FEED_PARSE_BATCH: 'feed.parse_batch',
  FEED_PERSIST_BATCH: 'feed.persist_batch',

  // LLM / OpenRouter
  LLM_OPENROUTER_CHAT: 'llm.openrouter.chat',

  // Agent decision
  AGENT_DECISION: 'agent.decision',
} as const;

/** OTel stable metric names and project-scoped metric names. */
export const METRIC_NAMES = {
  // OTel stable HTTP metrics (unit: s, Histogram)
  HTTP_SERVER_REQUEST_DURATION: 'http.server.request.duration',
  HTTP_CLIENT_REQUEST_DURATION: 'http.client.request.duration',

  // OTel stable database metric (unit: s, Histogram)
  DB_CLIENT_OPERATION_DURATION: 'db.client.operation.duration',

  // Project-scoped Histograms (singular nouns, unit: s)
  WS_MESSAGE_DURATION: 'app.ws.message.duration',
  AGENT_DECISION_DURATION: 'app.agent.decision.duration',

  // Project-scoped UpDownCounters (.count suffix)
  WS_CONNECTION_COUNT: 'app.ws.connection.count',
  BOTTLENECK_QUEUE_COUNT: 'app.bottleneck.queue.count',
  FEED_SUBSCRIPTION_COUNT: 'app.feed.subscription.count',

  // Project-scoped Counters (plural nouns, monotonic)
  FEED_INGESTED_MESSAGES: 'app.feed.ingested.messages',
  WS_SENT_MESSAGES: 'app.ws.sent.messages',
  RETRY_FAILED_ATTEMPTS: 'app.retry.failed.attempts',
} as const;

/** OTel attribute keys — semantic conventions and project-scoped app.* keys. */
export const ATTR_KEYS = {
  // HTTP semantic conventions
  HTTP_REQUEST_METHOD: 'http.request.method',
  HTTP_ROUTE: 'http.route',
  HTTP_RESPONSE_STATUS_CODE: 'http.response.status_code',
  URL_PATH: 'url.path',
  URL_SCHEME: 'url.scheme',
  SERVER_ADDRESS: 'server.address',
  SERVER_PORT: 'server.port',
  NETWORK_PROTOCOL_VERSION: 'network.protocol.version',

  // Database semantic conventions
  DB_SYSTEM_NAME: 'db.system.name',
  DB_NAMESPACE: 'db.namespace',
  DB_OPERATION_NAME: 'db.operation.name',
  DB_COLLECTION_NAME: 'db.collection.name',

  // DB literal value for db.system.name attribute
  DB_SYSTEM_SQLITE: 'sqlite',

  // Feed / App domain
  APP_FEED_SOURCE: 'app.feed.source',
  APP_MARKET_SYMBOL: 'app.market.symbol',
  APP_STRATEGY_NAME: 'app.strategy.name',
  APP_MONEY_SCALE: 'app.money.scale',

  // AI / OpenRouter
  APP_AI_PROVIDER: 'app.ai.provider',
  APP_AI_MODEL: 'app.ai.model',

  // Retry
  RETRY_ATTEMPT: 'retry.attempt',
  RETRY_DELAY_MS: 'retry.delay_ms',
  UPSTREAM_STATUS_CODE: 'upstream.status_code',
  RATE_LIMITER_PROVIDER: 'rate_limiter.provider',
  RATE_LIMITER_QUEUED: 'rate_limiter.queued',
} as const;
