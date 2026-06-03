import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { replayRun } from '@arena/db';
import { DemoRunAlreadyExistsSchema, DemoRunCreatedSchema, DemoRunStoppedSchema, EventsEnvelopeSchema, RunParamsSchema, SummaryEnvelopeSchema, TelemetryEnvelopeSchema } from '../contracts.js';
import { buildRunSummary, buildTelemetry, runDeterministicDemo, seedDemoIfEmpty, toEnvelope } from '../services.js';
import { sendError, sendOk } from './helpers.js';

const StartRunBodySchema = z.object({ runId: z.string().min(1).default('demo-local-paper-arena') }).default({ runId: 'demo-local-paper-arena' });

export const runRoutes: FastifyPluginAsync = async (app) => {
  app.post('/v1/runs', async (request, reply) => {
    const parsed = StartRunBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_body', 'Invalid run body.', parsed.error.issues);
    const { runId } = parsed.data;
    if (replayRun(app.arenaDb, runId).length === 0) {
      return sendOk(reply, 201, DemoRunCreatedSchema, { status: 'created', run: runDeterministicDemo({ db: app.arenaDb, runId }) });
    }
    return sendOk(reply, 200, DemoRunAlreadyExistsSchema, { status: 'already_exists', telemetry: buildTelemetry(app.arenaDb, runId) });
  });

  app.delete('/v1/runs/:runId', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    return sendOk(reply, 200, DemoRunStoppedSchema, { status: 'stopped', runId: parsed.data.runId, message: 'No live simulator loop was running; append-only events were preserved.' });
  });

  app.get('/v1/runs/:runId', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    return reply.code(200).send(SummaryEnvelopeSchema.parse({ ok: true, data: buildRunSummary(app.arenaDb, parsed.data.runId) }));
  });

  app.get('/v1/runs/:runId/events', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    seedDemoIfEmpty(app.arenaDb, parsed.data.runId);
    const events = replayRun(app.arenaDb, parsed.data.runId).map(toEnvelope);
    return reply.code(200).send(EventsEnvelopeSchema.parse({ ok: true, data: events }));
  });

  app.get('/v1/runs/:runId/telemetry', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    return reply.code(200).send(TelemetryEnvelopeSchema.parse({ ok: true, data: buildTelemetry(app.arenaDb, parsed.data.runId) }));
  });

  app.get('/v1/runs/:runId/summary', async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'invalid_run_id', 'Invalid run id.', parsed.error.issues);
    return reply.code(200).send(SummaryEnvelopeSchema.parse({ ok: true, data: buildRunSummary(app.arenaDb, parsed.data.runId) }));
  });
};
