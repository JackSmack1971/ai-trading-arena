import fp from 'fastify-plugin';
import { createLogger, type Logger } from '@arena/telemetry';

declare module 'fastify' {
  interface FastifyInstance {
    arenaLogger: Logger;
  }
}

export const loggerPlugin = fp(async (app) => {
  app.decorate('arenaLogger', createLogger('api'));
}, { name: 'arena-logger' });
