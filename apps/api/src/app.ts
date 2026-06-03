import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ArenaDb } from '@arena/db';
import { ALLOWED_ORIGIN } from './contracts.js';
import { dbPlugin } from './plugins/db.js';
import { loggerPlugin } from './plugins/logger.js';
import { websocketPlugin } from './plugins/websocket.js';
import { demoRoutes } from './routes/demo.js';
import { sendError } from './routes/helpers.js';
import { healthRoutes } from './routes/health.js';
import { runRoutes } from './routes/runs.js';
import { telemetryStreamRoutes } from './routes/telemetry-stream.js';

export interface BuildAppOptions {
  db?: ArenaDb;
  dbFileName?: string;
  migrate?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  await app.register(loggerPlugin);
  await app.register(cors, {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type'],
  });
  const dbOptions = {
    ...(options.db === undefined ? {} : { db: options.db }),
    ...(options.dbFileName === undefined ? {} : { dbFileName: options.dbFileName }),
    ...(options.migrate === undefined ? {} : { migrate: options.migrate }),
  };
  await app.register(dbPlugin, dbOptions);
  await app.register(websocketPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return sendError(reply, 400, 'validation_error', 'Request or response validation failed.', error.issues);
    }
    app.arenaLogger.error({ err: error }, 'request failed');
    return sendError(reply, 500, 'internal_error', 'Internal server error.');
  });

  await app.register(healthRoutes);
  await app.register(demoRoutes);
  await app.register(runRoutes);
  await app.register(telemetryStreamRoutes);

  return app;
}
