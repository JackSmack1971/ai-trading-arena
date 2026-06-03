import websocket from '@fastify/websocket';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    telemetryIntervals: Set<ReturnType<typeof setInterval>>;
  }
}

export const websocketPlugin = fp(async (app) => {
  const telemetryIntervals = new Set<ReturnType<typeof setInterval>>();
  app.decorate('telemetryIntervals', telemetryIntervals);

  await app.register(websocket, {
    options: { maxPayload: 64 * 1024 },
    preClose(done) {
      for (const interval of telemetryIntervals) clearInterval(interval);
      telemetryIntervals.clear();
      done();
    },
  });
}, { name: 'arena-websocket' });
