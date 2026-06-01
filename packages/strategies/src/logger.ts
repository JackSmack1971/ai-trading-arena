import { pino } from 'pino';

export const strategyLogger = pino({
  name: 'strategies',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      'headers.x-api-key',
      'env.OPENROUTER_API_KEY',
      'OPENROUTER_API_KEY',
      'apiKey',
      'input.messages',
      'output.choices',
    ],
  },
});
