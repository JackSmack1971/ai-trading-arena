import { AgentDecisionSchema, type AgentDecision, type AgentObservation } from '@arena/core';

export interface PaperAgent {
  readonly agentId: string;
  readonly name: string;
  decide(observation: AgentObservation): AgentDecision;
}

export interface DeterministicAgentConfig {
  agentId: string;
  name: string;
  side: 'BUY' | 'SELL' | 'NOOP';
  quantityUsd: string;
  confidence: number;
}

function noopDecision(summary: string, confidence = 0.5): AgentDecision {
  return AgentDecisionSchema.parse({
    action: 'NOOP',
    confidence,
    thesis: {
      summary,
      evidence: ['Deterministic local paper-agent fixture.'],
      invalidation: 'No paper action is required for this observation.',
      expectedHoldingPeriod: 'one replay tick',
    },
    risk: { maxLossUsd: '0' },
  });
}

export function createDeterministicPaperAgent(config: DeterministicAgentConfig): PaperAgent {
  return {
    agentId: config.agentId,
    name: config.name,
    decide(observation) {
      if (config.side === 'NOOP') {
        return noopDecision(`${config.name} holds because its deterministic policy is NOOP.`, config.confidence);
      }

      if (!observation.allowedActions.includes('PLACE_MARKET_ORDER')) {
        return noopDecision(`${config.name} holds because market orders are not allowed.`, config.confidence);
      }

      return AgentDecisionSchema.parse({
        action: 'PLACE_MARKET_ORDER',
        symbol: observation.marketState.symbol,
        side: config.side,
        quantityUsd: config.quantityUsd,
        confidence: config.confidence,
        thesis: {
          summary: `${config.name} issues a schema-validated ${config.side} decision for the deterministic demo run.`,
          evidence: [
            `last=${observation.marketState.last}`,
            `equity=${observation.portfolio.equity}`,
            `drawdown=${observation.riskState.currentDrawdownPct}`,
          ],
          invalidation: 'Risk gate rejection or unavailable paper cash invalidates this action.',
          expectedHoldingPeriod: 'single local simulator tick',
        },
        risk: { maxLossUsd: '25' },
      });
    },
  };
}

export function createDemoPaperAgents(): PaperAgent[] {
  return [
    createDeterministicPaperAgent({
      agentId: 'agent-momentum',
      name: 'Momentum Demo Agent',
      side: 'BUY',
      quantityUsd: '1000',
      confidence: 0.72,
    }),
    createDeterministicPaperAgent({
      agentId: 'agent-cash-preserver',
      name: 'Cash Preserver Demo Agent',
      side: 'NOOP',
      quantityUsd: '0',
      confidence: 0.61,
    }),
  ];
}
