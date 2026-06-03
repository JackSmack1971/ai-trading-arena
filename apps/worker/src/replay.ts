import { pino } from 'pino';
import { countEvents, createDb, projectEventTypeCounts, projectRunSummary, replayRun, verifyHashChain } from '@arena/db';
import { runDeterministicDemo } from './demo.js';
import { ensureWorkerDbMigrated } from './db.js';

const logger = pino({ name: 'worker-replay' });

export interface ReplayReport {
  runId: string;
  eventCount: number;
  hashChainValid: boolean;
  firstSeq: number | null;
  lastSeq: number | null;
  eventTypeCounts: Record<string, number>;
}

export function buildReplayReport(dbFileName: string, runId: string): ReplayReport {
  const db = createDb(dbFileName);
  ensureWorkerDbMigrated(db);

  if (countEvents(db, runId) === 0) {
    logger.info({ runId, dbFileName }, 'no events found for run; seeding deterministic paper-arena demo');
    runDeterministicDemo({ db, runId });
  }

  const rows = replayRun(db, runId);
  const summary = projectRunSummary(rows);
  const counts = Object.fromEntries(projectEventTypeCounts(rows).map((item) => [item.type, item.count]));

  const report: ReplayReport = {
    runId,
    eventCount: rows.length,
    hashChainValid: verifyHashChain(db, runId),
    firstSeq: summary?.firstSeq ?? null,
    lastSeq: summary?.lastSeq ?? null,
    eventTypeCounts: counts,
  };

  db.$client.close();

  return report;
}

function main(): void {
  const dbFileName = process.env['DB_FILE_NAME'] ?? 'arena.db';
  const runId = process.env['RUN_ID'] ?? 'demo-local-paper-arena';
  const report = buildReplayReport(dbFileName, runId);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.hashChainValid) process.exitCode = 1;
}

const isEntry = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntry) {
  main();
}
