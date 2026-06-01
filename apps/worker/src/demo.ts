import { appendEventPayload, createDb, replayRun, verifyHashChain, type ArenaDb } from '@arena/db';
import { createDemoPaperAgents, type PaperAgent } from '@arena/agents';
import { PaperBroker, type BrokerEventPayload, type MarketTick } from '@arena/broker-paper';
import {
  AgentDecisionSchema,
  AgentObservationSchema,
  NormalizedMarketEventSchema,
  type AgentDecision,
  type AgentObservation,
  type NormalizedMarketEvent,
  type PortfolioSummary,
  type RiskState,
  type StrategyDescriptor,
} from '@arena/core';

export interface DemoRunOptions {
  db?: ArenaDb;
  runId?: string;
  agents?: PaperAgent[];
  ticks?: NormalizedMarketEvent[];
  startingBalanceUsd?: string;
}

export interface DemoAgentResult {
  agentId: string;
  equity: string;
  cashBalance: string;
  totalPositionValue: string;
  tradeCount: number;
}

export interface DemoRunResult {
  runId: string;
  eventCount: number;
  hashChainValid: boolean;
  agents: DemoAgentResult[];
}

const DEFAULT_RUN_ID = 'demo-local-paper-arena';
const DEFAULT_SYMBOL = 'BTC-USD';

export function createDemoTicks(): NormalizedMarketEvent[] {
  return [
    createTick(0, '50000.00', '2026-01-01T00:00:00.000Z'),
    createTick(1, '50500.00', '2026-01-01T00:01:00.000Z'),
    createTick(2, '51000.00', '2026-01-01T00:02:00.000Z'),
  ];
}

export function runDeterministicDemo(options: DemoRunOptions = {}): DemoRunResult {
  const db = options.db ?? createDb(process.env['DB_FILE_NAME'] ?? 'arena.db');
  const runId = options.runId ?? process.env['RUN_ID'] ?? DEFAULT_RUN_ID;
  const ticks = options.ticks ?? createDemoTicks();
  const agents = options.agents ?? createDemoPaperAgents();
  const startingBalanceUsd = options.startingBalanceUsd ?? '10000';
  const brokers = new Map<string, PaperBroker>();

  for (const agent of agents) {
    brokers.set(agent.agentId, new PaperBroker({
      runId,
      agentId: agent.agentId,
      startingBalance: startingBalanceUsd,
      onEvent: (event) => appendBrokerEvent(db, runId, agent.agentId, event),
    }));
  }

  for (const [tickIndex, tickEvent] of ticks.entries()) {
    appendEventPayload(db, {
      runId,
      type: tickEvent.eventType,
      source: tickEvent.sourceId,
      payload: tickEvent as Record<string, unknown>,
      timestamp: tickEvent.exchangeTimestamp,
    });

    const marketTick = toMarketTick(tickEvent);

    for (const agent of agents) {
      const broker = mustGetBroker(brokers, agent.agentId);
      const observation = buildObservation({ agent, broker, tickEvent, runId, tickIndex });
      appendEventPayload(db, {
        runId,
        type: 'AGENT_DECISION_REQUESTED',
        source: agent.agentId,
        payload: {
          observationId: observation.observationId,
          agentId: agent.agentId,
          triggerReason: 'DETERMINISTIC_DEMO_TICK',
        },
        timestamp: tickEvent.exchangeTimestamp,
      });

      const decision = AgentDecisionSchema.parse(agent.decide(observation));
      appendDecision(db, runId, agent.agentId, observation.observationId, decision, tickEvent.exchangeTimestamp);
      applyDecisionThroughPaperBroker(broker, agent.agentId, decision, tickEvent, tickIndex);
      broker.processMarketTick(marketTick);
      broker.getPnLSnapshot(tickEvent.exchangeTimestamp);
    }
  }

  const rows = replayRun(db, runId);
  return {
    runId,
    eventCount: rows.length,
    hashChainValid: verifyHashChain(db, runId),
    agents: agents.map((agent) => {
      const broker = mustGetBroker(brokers, agent.agentId);
      const summary = broker.getPortfolioSummary(ticks.at(-1)?.exchangeTimestamp ?? new Date(0).toISOString());
      return {
        agentId: agent.agentId,
        equity: summary.equity,
        cashBalance: summary.cashBalance,
        totalPositionValue: summary.totalPositionValue,
        tradeCount: broker.getAllOrders().filter((order) => order.status === 'FILLED').length,
      };
    }),
  };
}


function createTick(sequence: number, last: string, timestamp: string): NormalizedMarketEvent {
  return NormalizedMarketEventSchema.parse({
    eventId: `demo-${DEFAULT_SYMBOL}-${sequence}`,
    sourceId: 'demo-feed',
    symbol: DEFAULT_SYMBOL,
    eventType: 'MARKET_TICK_RECEIVED',
    exchangeTimestamp: timestamp,
    receivedAt: timestamp,
    bid: (Number.parseFloat(last) - 5).toFixed(2),
    ask: (Number.parseFloat(last) + 5).toFixed(2),
    last,
    close: last,
    latencyMs: 0,
  });
}

function appendDecision(
  db: ArenaDb,
  runId: string,
  agentId: string,
  observationId: string,
  decision: AgentDecision,
  timestamp: string,
): void {
  appendEventPayload(db, {
    runId,
    type: 'AGENT_DECISION_RECEIVED',
    source: agentId,
    payload: {
      observationId,
      decisionId: `decision-${agentId}-${observationId}`,
      agentId,
      decision,
      schemaValid: true,
      repairAttempted: false,
      latencyMs: 0,
    },
    timestamp,
  });
}

function applyDecisionThroughPaperBroker(
  broker: PaperBroker,
  agentId: string,
  decision: AgentDecision,
  _tickEvent: NormalizedMarketEvent,
  tickIndex: number,
): void {
  if (decision.action !== 'PLACE_MARKET_ORDER' || !decision.symbol || !decision.side || !decision.quantityUsd) return;

  broker.placeMarketOrder({
    orderId: `paper-${agentId}-${tickIndex}`,
    symbol: decision.symbol,
    side: decision.side,
    quantityUsd: decision.quantityUsd,
    orderType: 'MARKET',
    decisionId: `decision-${agentId}-${tickIndex}`,
    executionMode: 'PAPER',
    executionVenue: 'PAPER',
  });
}

function appendBrokerEvent(db: ArenaDb, runId: string, agentId: string, event: BrokerEventPayload): void {
  const payload = event as unknown as Record<string, unknown>;
  appendEventPayload(db, {
    runId,
    type: event.type,
    source: agentId,
    payload,
    timestamp: brokerEventTimestamp(event),
  });
}

function brokerEventTimestamp(event: BrokerEventPayload): string {
  switch (event.type) {
    case 'PAPER_ORDER_CREATED':
    case 'PAPER_ORDER_CANCELLED':
      return event.order.updatedAt;
    case 'PAPER_ORDER_FILLED':
      return event.fill.timestamp;
    case 'POSITION_UPDATED':
      return event.position.updatedAt;
    case 'PNL_SNAPSHOT_CREATED':
      return event.snapshot.timestamp;
    case 'RISK_CHECK_PASSED':
    case 'RISK_CHECK_REJECTED':
      return event.riskEvent.timestamp;
    case 'PAPER_ORDER_REJECTED':
      return event.riskEvent?.timestamp ?? new Date().toISOString();
  }
}

function buildObservation(args: {
  agent: PaperAgent;
  broker: PaperBroker;
  tickEvent: NormalizedMarketEvent;
  runId: string;
  tickIndex: number;
}): AgentObservation {
  const { agent, broker, tickEvent, runId, tickIndex } = args;
  const timestamp = tickEvent.exchangeTimestamp;
  const portfolio = broker.getPortfolioSummary(timestamp);
  const riskState = buildRiskState(runId, agent.agentId, portfolio, timestamp);
  const allowedStrategies: StrategyDescriptor[] = [{ id: 'demo-momentum', name: 'Demo Momentum', version: '0.1.0' }];

  return AgentObservationSchema.parse({
    observationId: `obs-${agent.agentId}-${tickIndex}`,
    runId,
    agentId: agent.agentId,
    timestamp,
    marketState: {
      symbol: tickEvent.symbol,
      bid: tickEvent.bid ?? tickEvent.last ?? '0',
      ask: tickEvent.ask ?? tickEvent.last ?? '0',
      last: tickEvent.last ?? tickEvent.close ?? '0',
      spreadBps: '2',
      volume24h: tickEvent.volume ?? '0',
      priceChange24hPct: '0',
      recentBars: [],
      lastUpdatedAt: timestamp,
    },
    portfolio,
    openOrders: broker.getOpenOrders(),
    recentSignals: [],
    recentTrades: [],
    riskState,
    allowedActions: ['NOOP', 'PLACE_MARKET_ORDER'],
    allowedStrategies,
  });
}

function buildRiskState(runId: string, agentId: string, portfolio: PortfolioSummary, timestamp: string): RiskState {
  return {
    runId,
    agentId,
    currentDrawdownPct: portfolio.currentDrawdownPct,
    maxDrawdownPct: '5',
    positionValueUsd: portfolio.totalPositionValue,
    totalExposurePct: portfolio.exposurePct,
    ordersThisMinute: 0,
    strategySwitchesThisHour: 0,
    lastEvaluatedAt: timestamp,
  };
}

function toMarketTick(event: NormalizedMarketEvent): MarketTick {
  const lastPrice = event.last ?? event.close ?? '0';
  return {
    symbol: event.symbol,
    timestamp: event.exchangeTimestamp,
    bid: event.bid ?? lastPrice,
    ask: event.ask ?? lastPrice,
    lastPrice,
  };
}

function mustGetBroker(brokers: Map<string, PaperBroker>, agentId: string): PaperBroker {
  const broker = brokers.get(agentId);
  if (!broker) throw new Error(`Missing paper broker for ${agentId}`);
  return broker;
}

