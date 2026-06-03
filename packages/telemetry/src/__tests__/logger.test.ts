import { describe, expect, it } from 'vitest';
import { ATTR_KEYS, METRIC_NAMES, SPAN_NAMES, createChildLogger, createLogger, createRootLogger } from '../index.js';

function captureLogger(level = 'info') {
  const lines: string[] = [];
  const stream = { write: (line: string) => { lines.push(line); } };
  const logger = createRootLogger({ name: 'test', level, stream });
  return { logger, lines };
}

describe('createLogger', () => {
  it('returns a Pino logger instance', () => {
    const logger = createLogger('test-package');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('sets the logger name binding', () => {
    const logger = createLogger('feeds');
    expect(logger.bindings()['name']).toBe('feeds');
  });

  it('uses the configured level', () => {
    const { logger } = captureLogger('debug');
    expect(logger.level).toBe('debug');
  });

  it('redacts apiKey fields', () => {
    const { logger, lines } = captureLogger();
    logger.info({ apiKey: 'secret-token' }, 'redaction check');
    const record = JSON.parse(lines[0]!);
    expect(record.apiKey).toBe('[REDACTED]');
    expect(lines[0]).not.toContain('secret-token');
  });

  it('exposes a child method that merges bindings', () => {
    const { logger, lines } = captureLogger();
    const child = createChildLogger(logger, { traceId: 'abc-123', requestId: 'req-1' });
    child.info('child check');
    const childBindings = child.bindings();
    const record = JSON.parse(lines[0]!);
    expect(childBindings['traceId']).toBe('abc-123');
    expect(childBindings['requestId']).toBe('req-1');
    expect(record.traceId).toBe('abc-123');
  });
});

describe('SPAN_NAMES', () => {
  it('LLM_OPENROUTER_CHAT is the correct string', () => {
    expect(SPAN_NAMES.LLM_OPENROUTER_CHAT).toBe('llm.openrouter.chat');
  });

  it('FEED_SUBSCRIBE is a non-empty string', () => {
    expect(typeof SPAN_NAMES.FEED_SUBSCRIBE).toBe('string');
    expect(SPAN_NAMES.FEED_SUBSCRIBE.length).toBeGreaterThan(0);
  });

  it('HTTP_SERVER builder returns method + route', () => {
    expect(SPAN_NAMES.HTTP_SERVER('GET', '/v1/runs/:runId')).toBe('GET /v1/runs/:runId');
  });

  it('WS_RECEIVE builder returns correct format', () => {
    expect(SPAN_NAMES.WS_RECEIVE('/ws/telemetry')).toBe('WS RECEIVE /ws/telemetry');
  });

  it('DB_TABLE builder returns operation + table', () => {
    expect(SPAN_NAMES.DB_TABLE('SELECT', 'events')).toBe('SELECT events');
  });
});

describe('METRIC_NAMES', () => {
  it('HTTP_SERVER_REQUEST_DURATION is OTel stable name', () => {
    expect(METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION).toBe('http.server.request.duration');
  });

  it('WS_CONNECTION_COUNT ends with .count', () => {
    expect(METRIC_NAMES.WS_CONNECTION_COUNT).toBe('app.ws.connection.count');
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(METRIC_NAMES)) {
      expect(typeof value, `METRIC_NAMES.${key} should be string`).toBe('string');
      expect(value.length, `METRIC_NAMES.${key} should be non-empty`).toBeGreaterThan(0);
    }
  });
});

describe('ATTR_KEYS', () => {
  it('DB_SYSTEM_NAME is the OTel semantic key', () => {
    expect(ATTR_KEYS.DB_SYSTEM_NAME).toBe('db.system.name');
  });

  it('DB_SYSTEM_SQLITE is the literal value sqlite', () => {
    expect(ATTR_KEYS.DB_SYSTEM_SQLITE).toBe('sqlite');
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(ATTR_KEYS)) {
      expect(typeof value, `ATTR_KEYS.${key} should be string`).toBe('string');
      expect(value.length, `ATTR_KEYS.${key} should be non-empty`).toBeGreaterThan(0);
    }
  });
});
