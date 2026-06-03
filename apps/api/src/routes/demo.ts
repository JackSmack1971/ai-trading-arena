import type { FastifyPluginAsync } from 'fastify';
import { replayRun } from '@arena/db';
import { DemoRunAlreadyExistsSchema, DemoRunCreatedSchema, DemoRunStoppedSchema, RunQuerySchema } from '../contracts.js';
import { buildTelemetry, runDeterministicDemo } from '../services.js';
import { sendError, sendOk } from './helpers.js';

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/v1/demo/run', async (request, reply) => {
    const parsed = RunQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_run_query', 'Invalid demo run query parameters.', parsed.error.issues);
    }

    const { runId } = parsed.data;
    if (replayRun(app.arenaDb, runId).length === 0) {
      return sendOk(reply, 201, DemoRunCreatedSchema, { status: 'created', run: runDeterministicDemo({ db: app.arenaDb, runId }) });
    }

    return sendOk(reply, 200, DemoRunAlreadyExistsSchema, { status: 'already_exists', telemetry: buildTelemetry(app.arenaDb, runId) });
  });

  app.delete('/v1/demo/run', async (request, reply) => {
    const parsed = RunQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_run_query', 'Invalid demo run query parameters.', parsed.error.issues);
    }

    return sendOk(reply, 200, DemoRunStoppedSchema, {
      status: 'stopped',
      runId: parsed.data.runId,
      message: 'No live simulator loop was running; append-only events were preserved.',
    });
  });
};
