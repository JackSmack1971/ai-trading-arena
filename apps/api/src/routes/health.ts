import type { FastifyPluginAsync } from 'fastify';
import { HealthDataSchema } from '../contracts.js';
import { sendOk } from './helpers.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/health', async (_request, reply) => {
    return sendOk(reply, 200, HealthDataSchema, { ok: true, service: 'arena-api' });
  });
};
