import { AgentTelemetrySnapshotSchema, type AgentTelemetrySnapshot } from '@arena/core';
import type { ArenaDb } from '../client.js';
import { replayRun } from '../repositories/events.js';
import { parsePayload } from './helpers.js';

export function projectAgentTelemetry(db: ArenaDb, runId: string): AgentTelemetrySnapshot {
  let decisionsTotal = 0;
  let decisionsFailed = 0;
  let noopCount = 0;
  let lastDecisionAt: string | undefined;
  let currentStrategy: string | undefined;
  const strategyHistory: AgentTelemetrySnapshot['strategyHistory'] = [];

  for (const row of replayRun(db, runId)) {
    const payload = parsePayload(row);
    if (row.type === 'AGENT_DECISION_RECEIVED') {
      decisionsTotal += 1;
      lastDecisionAt = row.timestamp;
      const decision = payload['decision'] as Record<string, unknown> | undefined;
      if (decision?.['action'] === 'NOOP') noopCount += 1;
    }
    if (row.type === 'AGENT_DECISION_INVALID') {
      decisionsTotal += 1;
      decisionsFailed += 1;
      lastDecisionAt = row.timestamp;
    }
    if (row.type === 'STRATEGY_SWITCH_REQUESTED' || row.type === 'STRATEGY_SWITCHED') {
      const strategyId = String(payload['strategyId'] ?? payload['toStrategyId'] ?? payload['requestedStrategyId'] ?? 'unknown-strategy');
      currentStrategy = strategyId;
      strategyHistory.push({ strategyId, requestedAt: row.timestamp, agentId: typeof payload['agentId'] === 'string' ? payload['agentId'] : undefined });
    }
  }
  return AgentTelemetrySnapshotSchema.parse({
    runId,
    decisionsTotal,
    decisionsSucceeded: decisionsTotal - decisionsFailed,
    decisionsFailed,
    noopCount,
    lastDecisionAt,
    currentStrategy,
    strategyHistory,
  });
}
