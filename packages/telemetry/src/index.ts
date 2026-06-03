// packages/telemetry/src/index.ts
// Pino logger factory for @arena/telemetry.
// Per D-01: factory only — existing package loggers adopt this in Phase 2+.
// Per D-02: OTel scope is naming constants only; no NodeSDK or exporter here.
// Per D-03: redact.paths implements the complete list from .claude/rules/pino-logs.md.
import { pino } from 'pino';
import type { Logger } from 'pino';

export type { Logger };

/**
 * Creates a root Pino logger with the given name.
 * Sets messageKey: 'message' and the complete redact.paths list from pino-logs.md.
 * Usage: `export const feedLogger = createLogger('feeds')`
 */
export function createLogger(name: string): Logger {
  return pino({
    name,
    messageKey: 'message',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'headers["x-api-key"]',
        'headers.authorization',
        'headers.cookie',
        'env.OPENROUTER_API_KEY',
        'apiKey',
        'input.messages',
        'output.choices',
        'request.messages',
        'response.choices',
        '*.apiKey',
        '*.api_key',
      ],
      censor: '[REDACTED]',
    },
  });
}

/**
 * Creates a child logger with additional bound fields.
 * Usage: `const reqLogger = createChildLogger(logger, { requestId, traceId })`
 */
export function createChildLogger(
  parent: Logger,
  bindings: Record<string, unknown>,
): Logger {
  return parent.child(bindings);
}

// Re-export OTel naming constants so consumers have a single import point.
export * from './naming.js';
