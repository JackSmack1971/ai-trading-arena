import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { RunParamsSchema, RunQuerySchema, TelemetryWsEnvelopeSchema } from '../contracts.js';
import { buildTelemetry } from '../services.js';

function sendWsJson(app: FastifyInstance, socket: WebSocket, body: unknown): void {
  if (socket.readyState !== socket.OPEN) return;
  if (socket.bufferedAmount > 64 * 1024) {
    app.arenaLogger.warn({ bufferedAmount: socket.bufferedAmount }, 'dropping telemetry frame due to websocket backpressure');
    return;
  }
  socket.send(JSON.stringify(body));
}

function parseQueryRunId(request: FastifyRequest): string | null {
  const parsed = RunQuerySchema.safeParse(request.query);
  return parsed.success ? parsed.data.runId : null;
}

function parseParamRunId(request: FastifyRequest): string | null {
  const parsed = RunParamsSchema.safeParse(request.params);
  return parsed.success ? parsed.data.runId : null;
}

export const telemetryStreamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/telemetry/stream', { websocket: true }, (socket, request) => {
    const runId = parseQueryRunId(request);
    if (runId === null) {
      app.arenaLogger.warn({ query: request.query }, 'websocket rejected: invalid run query');
      socket.close(1008, 'invalid run id');
      return;
    }
    attachTelemetrySocket(app, socket, runId);
  });

  app.get('/v1/runs/:runId/telemetry/stream', { websocket: true }, (socket, request) => {
    const runId = parseParamRunId(request);
    if (runId === null) {
      app.arenaLogger.warn({ params: request.params }, 'websocket rejected: invalid run id');
      socket.close(1008, 'invalid run id');
      return;
    }
    attachTelemetrySocket(app, socket, runId);
  });
};

function attachTelemetrySocket(
  app: FastifyInstance,
  socket: WebSocket,
  runId: string,
): void {
  const snapshot = () => TelemetryWsEnvelopeSchema.parse({ type: 'telemetry.snapshot', data: buildTelemetry(app.arenaDb, runId) });
  sendWsJson(app, socket, snapshot());

  let isAlive = true;
  socket.on('pong', () => { isAlive = true; });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      socket.terminate();
      return;
    }
    isAlive = false;
    socket.ping();
  }, 30_000);

  const telemetryInterval = setInterval(() => {
    sendWsJson(app, socket, snapshot());
  }, 2_000);

  app.telemetryIntervals.add(heartbeat);
  app.telemetryIntervals.add(telemetryInterval);

  socket.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(telemetryInterval);
    app.telemetryIntervals.delete(heartbeat);
    app.telemetryIntervals.delete(telemetryInterval);
  });

  socket.on('error', (err) => app.arenaLogger.warn({ err, runId }, 'telemetry websocket error'));
}
