import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type ArenaDb = ReturnType<typeof createDb>;

export function createDb(filePath: string, options?: { readonly?: boolean; verbose?: boolean }) {
  const sqlite = new Database(filePath, {
    readonly: options?.readonly ?? false,
    verbose: options?.verbose ? (sql?: unknown) => process.stdout.write(`[db] ${String(sql)}\n`) : undefined,
  });

  // WAL mode for concurrent reads without blocking writes.
  if (!options?.readonly) {
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('wal_autocheckpoint = 1000');
    sqlite.pragma('foreign_keys = ON');
  }

  return drizzle(sqlite, { schema });
}

export function createMemoryDb(verbose = false): ArenaDb {
  return createDb(':memory:', { verbose });
}
