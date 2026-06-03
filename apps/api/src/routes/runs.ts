import type { FastifyPluginAsync } from 'fastify';
import { replayRun } from '@arena/db';
import { EventsEnvelopeSchema, RunParamsSchema, SummaryEnvelopeSchema, TelemetryEnvelopeSchema } from '../contracts.js';
import { buildRunSummary, buildTelemetry, seedDemoIfEmpty, toEnvelope } from '../services.js';
import { sendError } from './helpers.js';

export const runRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/runs/:runId/events', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    }

    seedDemoIfEmpty(app.arenaDb, parsed.data.runId);
    const events = replayRun(app.arenaDb, parsed.data.runId).map(toEnvelope);
    return reply.code(200).send(EventsEnvelopeSchema.parse({ ok: true, data: events }));
  });

  app.get('/v1/runs/:runId/telemetry', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    }

    return reply.code(200).send(TelemetryEnvelopeSchema.parse({ ok: true, data: buildTelemetry(app.arenaDb, parsed.data.runId) }));
  });

  app.get('/v1/runs/:runId/summary', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    }

    return reply.code(200).send(SummaryEnvelopeSchema.parse({ ok: true, data: buildRunSummary(app.arenaDb, parsed.data.runId) }));
  });
};
