import fp from 'fastify-plugin';
import { createDb, type ArenaDb } from '@arena/db';
import { ensureApiDbMigrated } from '../services.js';

export interface DbPluginOptions {
  db?: ArenaDb;
  dbFileName?: string;
  migrate?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    arenaDb: ArenaDb;
  }
}

export const dbPlugin = fp<DbPluginOptions>(async (app, options) => {
  const db = options.db ?? createDb(options.dbFileName ?? process.env['DB_FILE_NAME'] ?? 'arena.db');
  if (!options.db && options.migrate !== false) {
    ensureApiDbMigrated(db);
  }
  app.decorate('arenaDb', db);
}, { name: 'arena-db' });
