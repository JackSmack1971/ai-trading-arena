import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { ArenaDb } from '@arena/db';

const workerSrcDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(workerSrcDir, '../../..');
export const migrationsFolder = path.join(workspaceRoot, 'packages/db/drizzle');

export function ensureWorkerDbMigrated(db: ArenaDb): void {
  migrate(db, { migrationsFolder });
}
