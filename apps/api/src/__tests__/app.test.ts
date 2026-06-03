import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryDb, replayRun, verifyHashChain, type ArenaDb } from '@arena/db';
import { buildApp, type BuildAppOptions } from '../app.js';
import {
  DemoRunEnvelopeSchema,
  EventsEnvelopeSchema,
  HealthEnvelopeSchema,
  SummaryEnvelopeSchema,
  TelemetryEnvelopeSchema,
  TelemetryWsEnvelopeSchema,
} from '../contracts.js';
import { ensureApiDbMigrated } from '../services.js';

let db: ArenaDb;
let app: Awaited<ReturnType<typeof buildApp>>;

async function startApp(options: BuildAppOptions = {}) {
  app = await buildApp({ db, migrate: false, ...options });
  await app.ready();
  return app;
}

beforeEach(() => {
  db = createMemoryDb();
  ensureApiDbMigrated(db);
});

afterEach(async () => {
  await app?.close();
});

describe('Fastify v1 HTTP routes', () => {
  it('GET /v1/health returns a validated response envelope', async () => {
    await startApp();

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(HealthEnvelopeSchema.parse(response.json())).toEqual({
      ok: true,
      data: { ok: true, service: 'arena-api' },
    });
  });

  it('POST /v1/demo/run creates a replayable demo run and validates run resources', async () => {
    await startApp();
    const runId = 'route-test-run';

    const created = await app.inject({ method: 'POST', url: `/v1/demo/run?runId=${encodeURIComponent(runId)}` });
    const createdBody = DemoRunEnvelopeSchema.parse(created.json());

    expect(created.statusCode).toBe(201);
    expect(createdBody.data.status).toBe('created');
    expect(createdBody.data.status === 'created' ? createdBody.data.run.hashChainValid : false).toBe(true);
    expect(replayRun(db, runId).length).toBeGreaterThan(0);
    expect(verifyHashChain(db, runId)).toBe(true);

    const duplicate = await app.inject({ method: 'POST', url: `/v1/demo/run?runId=${encodeURIComponent(runId)}` });
    const duplicateBody = DemoRunEnvelopeSchema.parse(duplicate.json());
    expect(duplicate.statusCode).toBe(200);
    expect(duplicateBody.data.status).toBe('already_exists');

    const telemetry = await app.inject({ method: 'GET', url: `/v1/runs/${encodeURIComponent(runId)}/telemetry` });
    expect(telemetry.statusCode).toBe(200);
    expect(TelemetryEnvelopeSchema.parse(telemetry.json()).data.hashChainValid).toBe(true);

    const events = await app.inject({ method: 'GET', url: `/v1/runs/${encodeURIComponent(runId)}/events` });
    expect(events.statusCode).toBe(200);
    expect(EventsEnvelopeSchema.parse(events.json()).data.length).toBeGreaterThan(0);

    const summary = await app.inject({ method: 'GET', url: `/v1/runs/${encodeURIComponent(runId)}/summary` });
    expect(summary.statusCode).toBe(200);
    expect(SummaryEnvelopeSchema.parse(summary.json()).data.eventCount).toBe(replayRun(db, runId).length);
  });

  it('DELETE /v1/demo/run returns a stop envelope without deleting append-only events', async () => {
    await startApp();
    const runId = 'stop-preserves-events';
    await app.inject({ method: 'POST', url: `/v1/demo/run?runId=${encodeURIComponent(runId)}` });
    const before = replayRun(db, runId).length;

    const stopped = await app.inject({ method: 'DELETE', url: `/v1/demo/run?runId=${encodeURIComponent(runId)}` });

    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toMatchObject({ ok: true, data: { status: 'stopped', runId } });
    expect(replayRun(db, runId)).toHaveLength(before);
  });

  it('rejects invalid run query parameters with a structured error envelope', async () => {
    await startApp();

    const response = await app.inject({ method: 'POST', url: '/v1/demo/run?runId=' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'invalid_run_query' } });
  });
});

describe('Fastify WebSocket telemetry stream', () => {
  it('GET /v1/telemetry/stream upgrades and emits a validated telemetry snapshot', async () => {
    await startApp();
    const runId = 'ws-stream-run';

    let resolveMessage: ((value: unknown) => void) | undefined;
    const message = new Promise<unknown>((resolve) => { resolveMessage = resolve; });
    const ws = await app.injectWS(`/v1/telemetry/stream?runId=${encodeURIComponent(runId)}`, {}, {
      onInit(client) {
        client.once('message', (raw) => resolveMessage?.(raw));
      },
    });
    const rawMessage = await message;
    const envelope = TelemetryWsEnvelopeSchema.parse(JSON.parse(String(rawMessage)));

    expect(envelope.type).toBe('telemetry.snapshot');
    expect(envelope.data.runId).toBe(runId);
    expect(envelope.data.hashChainValid).toBe(true);
    expect(app.telemetryIntervals.size).toBe(2);

    ws.terminate();
    await once(ws, 'close');
    expect(app.telemetryIntervals.size).toBe(0);
  });
});
