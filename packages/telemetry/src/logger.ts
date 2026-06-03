import { pino, type Logger, type LoggerOptions } from 'pino';

export interface CreateRootLoggerOptions extends LoggerOptions {
  name?: string;
  stream?: Parameters<typeof pino>[1];
}

export const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
  'res.headers["set-cookie"]',
  'headers.x-api-key',
  'headers["x-api-key"]',
  'headers.authorization',
  'headers.cookie',
  'env.OPENROUTER_API_KEY',
  'apiKey',
  '*.apiKey',
  '*.api_key',
  'input.messages',
  'output.choices',
  'request.messages',
  'response.choices',
];

export function createRootLogger(options: CreateRootLoggerOptions = {}): Logger {
  const { name = 'arena', level = process.env['LOG_LEVEL'] ?? 'info', redact, messageKey, stream, ...rest } = options;
  return pino({
    name,
    level,
    messageKey: messageKey ?? 'message',
    redact: redact ?? { paths: redactedPaths, censor: '[REDACTED]' },
    ...rest,
  }, stream);
}

export function createLogger(name: string): Logger {
  return createRootLogger({ name });
}

export function createChildLogger(parent: Logger, bindings: Record<string, unknown>): Logger {
  return parent.child(bindings);
}

export const logger = createRootLogger();
export type { Logger };
