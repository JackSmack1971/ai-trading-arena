import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { ATTR_KEYS, METRIC_NAMES, REDACT_PATHS, SPAN_NAMES, createChildLogger, createLogger } from '../index.js';

function captureLogger(name: string) {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      for (const line of chunk.toString().trim().split('\n')) {
        if (line.length > 0) lines.push(JSON.parse(line) as Record<string, unknown>);
      }
      callback();
    },
  });
  return { lines, logger: createLogger(name, stream) };
}

describe('createLogger', () => {
  it('returns a Pino logger with a name binding', () => {
    const logger = createLogger('feeds');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.child).toBe('function');
    expect(logger.bindings()['name']).toBe('feeds');
  });

  it('redacts configured secret and prompt paths', () => {
    const { lines, logger } = captureLogger('agents');
    logger.info({ apiKey: 'secret', input: { messages: ['prompt'] } }, 'call completed');

    expect(REDACT_PATHS).toContain('apiKey');
    expect(REDACT_PATHS).toContain('input.messages');
    expect(lines[0]?.['apiKey']).toBe('[REDACTED]');
    expect((lines[0]?.['input'] as Record<string, unknown>)['messages']).toBe('[REDACTED]');
    expect(lines[0]?.['message']).toBe('call completed');
  });

  it('creates child loggers with merged bindings', () => {
    const child = createChildLogger(createLogger('api'), { traceId: 'abc-123', requestId: 'req-1' });
    expect(child.bindings()['name']).toBe('api');
    expect(child.bindings()['traceId']).toBe('abc-123');
    expect(child.bindings()['requestId']).toBe('req-1');
  });
});

describe('OpenTelemetry naming constants', () => {
  it('exports exact span constants and builders', () => {
    expect(SPAN_NAMES.LLM_OPENROUTER_CHAT).toBe('llm.openrouter.chat');
    expect(SPAN_NAMES.FEED_SUBSCRIBE).toBe('feed.subscribe');
    expect(SPAN_NAMES.HTTP_SERVER('GET', '/v1/runs/:runId')).toBe('GET /v1/runs/:runId');
    expect(SPAN_NAMES.WS_RECEIVE('/v1/telemetry/stream')).toBe('WS RECEIVE /v1/telemetry/stream');
    expect(SPAN_NAMES.DB_TABLE('SELECT', 'events')).toBe('SELECT events');
  });

  it('exports non-empty metric constants', () => {
    expect(METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION).toBe('http.server.request.duration');
    expect(METRIC_NAMES.WS_CONNECTION_COUNT).toBe('app.ws.connection.count');
    for (const value of Object.values(METRIC_NAMES)) expect(value.length).toBeGreaterThan(0);
  });

  it('exports non-empty attribute constants', () => {
    expect(ATTR_KEYS.DB_SYSTEM_NAME).toBe('db.system.name');
    expect(ATTR_KEYS.DB_SYSTEM_SQLITE).toBe('sqlite');
    for (const value of Object.values(ATTR_KEYS)) expect(value.length).toBeGreaterThan(0);
  });
});
