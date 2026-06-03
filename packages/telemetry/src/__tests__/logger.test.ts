import { describe, it, expect } from 'vitest';
import { createLogger, createChildLogger, SPAN_NAMES, METRIC_NAMES, ATTR_KEYS } from '../index.js';

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
    // Pino exposes the bindings via logger.bindings()
    expect(logger.bindings()['name']).toBe('feeds');
  });

  it('exposes a child method that merges bindings', () => {
    const parent = createLogger('parent');
    const child = createChildLogger(parent, { traceId: 'abc-123', requestId: 'req-1' });
    const childBindings = child.bindings();
    expect(childBindings['traceId']).toBe('abc-123');
    expect(childBindings['requestId']).toBe('req-1');
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
      expect((value as string).length, `METRIC_NAMES.${key} should be non-empty`).toBeGreaterThan(0);
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
      expect((value as string).length, `ATTR_KEYS.${key} should be non-empty`).toBeGreaterThan(0);
    }
  });
});
