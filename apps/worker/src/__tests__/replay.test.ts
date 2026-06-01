import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildReplayReport } from '../replay.js';

let tmpPath: string | null = null;

afterEach(() => {
  if (tmpPath) {
    rmSync(tmpPath, { recursive: true, force: true });
    tmpPath = null;
  }
});

describe('worker replay CLI report', () => {
  it('migrates an empty local DB, seeds the deterministic demo, and validates the hash chain', () => {
    tmpPath = mkdtempSync(path.join(tmpdir(), 'arena-replay-'));
    const dbFile = path.join(tmpPath, 'arena.db');

    const report = buildReplayReport(dbFile, 'demo-test-run');

    expect(report.runId).toBe('demo-test-run');
    expect(report.eventCount).toBeGreaterThan(0);
    expect(report.hashChainValid).toBe(true);
    expect(report.firstSeq).toBe(0);
    expect(report.lastSeq).toBe(report.eventCount - 1);
    expect(report.eventTypeCounts['MARKET_TICK_RECEIVED']).toBe(3);
    expect(report.eventTypeCounts['AGENT_DECISION_RECEIVED']).toBe(6);
    expect(report.eventTypeCounts['RISK_CHECK_PASSED']).toBeGreaterThan(0);
    expect(report.eventTypeCounts['PAPER_ORDER_FILLED']).toBeGreaterThan(0);
  });
});
