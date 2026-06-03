import { pino } from 'pino';
import { createDb, appendEventPayload } from '@arena/db';
import { CoinbaseFeedAdapter } from '@arena/feeds';
import type { ArenaDb } from '@arena/db';
import { ensureWorkerDbMigrated } from './db.js';
import type { MarketFeedAdapter } from '@arena/core';

const logger = pino({ name: 'worker' });

export interface WorkerOptions {
  db?: ArenaDb;
  adapters?: MarketFeedAdapter[];
  runId?: string;
  symbols?: string[];
  signal?: AbortSignal;
  onTerminalError?: (err: Error) => void;
}

export interface WorkerHandle {
  stop: () => Promise<void>;
}

export async function runWorker(opts?: WorkerOptions): Promise<WorkerHandle> {
  const db = opts?.db ?? createDb(process.env['DB_FILE_NAME'] ?? 'arena.db');
  if (!opts?.db) ensureWorkerDbMigrated(db);
  const runId = opts?.runId ?? process.env['RUN_ID'] ?? `feed-${Date.now()}`;
  const symbols = opts?.symbols ?? (process.env['SYMBOLS']?.split(',') ?? ['BTC-USD']);
  const adapters: MarketFeedAdapter[] = opts?.adapters ?? [new CoinbaseFeedAdapter()];

  // Closure handle backfilled after stopHandle is constructed so that onError
  // callbacks registered inside the loop can trigger a full shutdown of all adapters.
  let stopFn: (() => Promise<void>) | null = null;

  for (const adapter of adapters) {
    // Wire the db sink: every normalized market event becomes a persisted row.
    adapter.onEvent((event) => {
      appendEventPayload(db, {
        runId,
        type: event.eventType,
        source: event.sourceId,
        payload: event as Record<string, unknown>,
        timestamp: event.exchangeTimestamp,
      });
    });

    // Wire terminal-error handler (D-03): when a feed exhausts reconnect attempts,
    // stop all adapters so the worker does not continue with a dead feed.
    // better-sqlite3 writes are synchronous and durable on return, so every
    // appendEventPayload call is already flushed before onError fires — no
    // extra flush step is needed.
    adapter.onError((err) => {
      logger.fatal({ err, adapterId: adapter.id }, 'feed adapter terminal error — stopping all adapters');
      if (stopFn) {
        void stopFn().catch(() => {
          // ignore errors during emergency shutdown
        });
      }
      opts?.onTerminalError?.(err);
    });
  }

  logger.info({ runId, symbols, adapterCount: adapters.length }, 'worker started');

  // Connect and subscribe all adapters.
  for (const adapter of adapters) {
    await adapter.connect({ symbols });
    logger.info({ adapterId: adapter.id }, 'adapter connected');
    await adapter.subscribe(symbols);
  }

  const stopHandle: WorkerHandle = {
    stop: async () => {
      logger.info({ runId }, 'worker shutting down');
      for (const adapter of adapters) {
        await adapter.disconnect();
      }
      logger.info({ runId }, 'worker shutdown complete');
    },
  };

  // Backfill the closure so onError callbacks can reach stop().
  stopFn = stopHandle.stop;

  // Honor AbortSignal for graceful shutdown.
  if (opts?.signal) {
    opts.signal.addEventListener('abort', () => {
      void stopHandle.stop().catch(() => {});
    });
  }

  return stopHandle;
}

// Module-guarded entry point: only run when this file is executed directly,
// never when it is imported (e.g., in tests). All process-level signal handlers
// and process.exit calls live here, never inside runWorker.
const isEntry = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;

async function main(): Promise<void> {
  let handle: WorkerHandle | null = null;

  const shutdown = async (code: number) => {
    if (handle) {
      await handle.stop().catch(() => {});
    }
    process.exit(code);
  };

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  handle = await runWorker({
    onTerminalError: (err) => {
      logger.fatal({ err }, 'irrecoverable feed error — exiting');
      // stop() was already called by the onError handler inside runWorker;
      // we only need to exit the process here.
      void shutdown(1);
    },
  });
}

if (isEntry) {
  void main().catch((err: unknown) => {
    logger.fatal({ err }, 'worker startup failed');
    process.exit(1);
  });
}
