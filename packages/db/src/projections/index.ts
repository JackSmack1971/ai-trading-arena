import type { EventRow } from '../schema.js';

// Projection stubs — each consumes the append-only event log and builds
// a read model. Implementations are added per-phase as the simulator grows.

export interface RunSummary {
  runId: string;
  eventCount: number;
  firstSeq: number;
  lastSeq: number;
  startedAt: string;
  lastEventAt: string;
}

export function projectRunSummary(events: EventRow[]): RunSummary | null {
  if (events.length === 0) return null;
  const first = events[0]!;
  const last = events[events.length - 1]!;
  return {
    runId: first.runId,
    eventCount: events.length,
    firstSeq: first.seq,
    lastSeq: last.seq,
    startedAt: first.timestamp,
    lastEventAt: last.timestamp,
  };
}

export interface EventTypeCount {
  type: string;
  count: number;
}

export function projectEventTypeCounts(events: EventRow[]): EventTypeCount[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    counts.set(ev.type, (counts.get(ev.type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}
