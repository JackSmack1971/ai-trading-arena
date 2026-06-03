import { pathToFileURL } from 'node:url';
import { buildApp } from './app.js';

export { buildApp } from './app.js';
export { buildTelemetry, runDeterministicDemo } from './services.js';
export type { ArenaTelemetry, DemoRunResult, EventEnvelope } from './contracts.js';

const isEntry = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (isEntry) {
  const port = Number.parseInt(process.env['PORT'] ?? '8787', 10);
  const host = process.env['HOST'] ?? '127.0.0.1';
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
  };
  process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)); });

  await app.listen({ port, host });
  app.arenaLogger.info({ port, host }, 'arena api listening');
}
