import { pino } from 'pino';
import type { DestinationStream, Logger } from 'pino';

export type { Logger };

export const REDACT_PATHS = [
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
] as const;

export function createLogger(name: string, stream?: DestinationStream): Logger {
  return pino(
    {
      name,
      messageKey: 'message',
      redact: {
        paths: [...REDACT_PATHS],
        censor: '[REDACTED]',
      },
    },
    stream,
  );
}

export function createChildLogger(parent: Logger, bindings: Record<string, unknown>): Logger {
  return parent.child(bindings);
}

export * from './naming.js';
