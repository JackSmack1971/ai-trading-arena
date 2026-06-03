import path from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import { pino } from 'pino';
import { WebSocketServer, type WebSocket } from 'ws';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, appendEventPayload, replayRun, verifyHashChain, countOrdersInWindow, countStrategySwitchesInWindow, type ArenaDb, type EventRow } from '@arena/db';
import { createDemoPaperAgents, type PaperAgent } from '@arena/agents';
import { PaperBroker, type BrokerEventPayload, type MarketTick } from '@arena/broker-paper';
import {
  AgentDecisionSchema,
  AgentObservationSchema,
  NormalizedMarketEventSchema,
  SimEventPayloadSchemas,
  MarketTickPayloadSchema,
  type AgentDecision,
  type AgentObservation,
  type NormalizedMarketEvent,
  type PortfolioSummary,
  type RiskState,
  type SimEventType,
  type StrategyDescriptor,
  type StrategySignal,
} from '@arena/core';

const logger = pino({ name: 'api' });
const DEFAULT_RUN_ID = 'demo-local-paper-arena';

export interface ApiServerOptions {
  db?: ArenaDb;
  dbFileName?: string;
  port?: number;
  host?: string;
}

export interface ArenaTelemetry {
  runId: string;
  eventCount: number;
  hashChainValid: boolean;
  marketTicks: ChartPoint[];
  equity: EquityPoint[];
  latestEvents: EventEnvelope[];
  eventTypeCounts: Record<string, number>;
  agents: AgentTelemetry[];
}

export interface ChartPoint {
  timestamp: string;
  symbol: string;
  price: string;
}

export interface EquityPoint {
  timestamp: string;
  agentId: string;
  equity: string;
  cashBalance: string;
  exposurePct: string;
}

export interface AgentTelemetry {
  agentId: string;
  latestEquity: string;
  latestCashBalance: string;
  latestExposurePct: string;
  filledOrders: number;
  lastDecisionSummary: string;
}

export interface EventEnvelope {
  seq: number;
  type: string;
  source: string;
  timestamp: string;
  payload: unknown;
}

export function buildTelemetry(db: ArenaDb, runId: string): ArenaTelemetry {
  seedDemoIfEmpty(db, runId);
  const rows = replayRun(db, runId);
  const latestEvents = rows.slice(-50).map(toEnvelope);
  const eventTypeCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    runId,
    eventCount: rows.length,
    hashChainValid: verifyHashChain(db, runId),
    marketTicks: rows.filter((row) => row.type === 'MARKET_TICK_RECEIVED').map(toMarketPoint),
    equity: rows.filter((row) => row.type === 'PNL_SNAPSHOT_CREATED').map(toEquityPoint),
    latestEvents,
    eventTypeCounts,
    agents: projectAgents(rows),
  };
}

export function createApiServer(options: ApiServerOptions = {}): { server: Server; db: ArenaDb } {
  const db = options.db ?? createDb(options.dbFileName ?? process.env['DB_FILE_NAME'] ?? 'arena.db');
  if (!options.db) ensureApiDbMigrated(db);

  const server = createServer((req, res) => {
    void handleHttp(req, res, db).catch((err: unknown) => {
      logger.error({ err }, 'http request failed');
      sendJson(res, 500, { error: 'internal_error' });
    });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/ws/runs/') || !url.pathname.endsWith('/telemetry')) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const runId = decodeURIComponent(url.pathname.split('/')[3] ?? DEFAULT_RUN_ID);
    sendWsJson(ws, { type: 'telemetry.snapshot', data: buildTelemetry(db, runId) });

    const interval = setInterval(() => {
      sendWsJson(ws, { type: 'telemetry.snapshot', data: buildTelemetry(db, runId) });
    }, 2_000);

    ws.on('close', () => clearInterval(interval));
    ws.on('error', (err) => logger.warn({ err, runId }, 'telemetry websocket error'));
  });

  return { server, db };
}

async function handleHttp(req: IncomingMessage, res: ServerResponse, db: ArenaDb): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'arena-api' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/demo/run') {
    const runId = url.searchParams.get('runId') ?? DEFAULT_RUN_ID;
    if (replayRun(db, runId).length === 0) {
      sendJson(res, 201, runDeterministicDemo({ db, runId }));
      return;
    }
    sendJson(res, 200, { status: 'already_exists', telemetry: buildTelemetry(db, runId) });
    return;
  }

  const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/(events|telemetry|summary)$/);
  if (req.method === 'GET' && match) {
    const runId = decodeURIComponent(match[1] ?? DEFAULT_RUN_ID);
    const resource = match[2];
    if (resource === 'events') {
      seedDemoIfEmpty(db, runId);
      sendJson(res, 200, replayRun(db, runId).map(toEnvelope));
      return;
    }
    if (resource === 'telemetry') {
      sendJson(res, 200, buildTelemetry(db, runId));
      return;
    }
    if (resource === 'summary') {
      const telemetry = buildTelemetry(db, runId);
      sendJson(res, 200, {
        runId: telemetry.runId,
        eventCount: telemetry.eventCount,
        hashChainValid: telemetry.hashChainValid,
        eventTypeCounts: telemetry.eventTypeCounts,
        agents: telemetry.agents,
      });
      return;
    }
  }

  sendJson(res, 404, { error: 'not_found' });
}

function seedDemoIfEmpty(db: ArenaDb, runId: string): void {
  if (replayRun(db, runId).length === 0) {
    runDeterministicDemo({ db, runId });
  }
}

function toEnvelope(row: EventRow): EventEnvelope {
  const raw: unknown = JSON.parse(row.payloadJson);
  const schema = SimEventPayloadSchemas[row.type as SimEventType];
  const payload = schema != null ? schema.parse(raw) : raw;
  return {
    seq: row.seq,
    type: row.type,
    source: row.source,
    timestamp: row.timestamp,
    payload,
  };
}

function toMarketPoint(row: EventRow): ChartPoint {
  const raw: unknown = JSON.parse(row.payloadJson);
  const payload = MarketTickPayloadSchema.parse(raw);
  return {
    timestamp: row.timestamp,
    symbol: payload.symbol,
    price: payload.last ?? payload.close ?? '0',
  };
}

function toEquityPoint(row: EventRow): EquityPoint {
  const raw: unknown = JSON.parse(row.payloadJson);
  const schema = SimEventPayloadSchemas[row.type as SimEventType];
  const payload = schema != null ? (schema.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
  const snapshot = (payload['snapshot'] as Record<string, string> | undefined) ?? {};
  return {
    timestamp: row.timestamp,
    agentId: snapshot['agentId'] ?? row.source,
    equity: snapshot['equity'] ?? '0',
    cashBalance: snapshot['cashBalance'] ?? '0',
    exposurePct: snapshot['exposurePct'] ?? '0',
  };
}

function projectAgents(rows: EventRow[]): AgentTelemetry[] {
  const agents = new Map<string, AgentTelemetry>();

  for (const row of rows) {
    const raw: unknown = JSON.parse(row.payloadJson);
    const schema = SimEventPayloadSchemas[row.type as SimEventType];
    const payload = (schema != null ? schema.parse(raw) : raw) as Record<string, unknown>;
    if (row.type === 'PNL_SNAPSHOT_CREATED') {
      const snapshot = payload['snapshot'] as Record<string, string> | undefined;
      if (!snapshot?.['agentId']) continue;
      const existing = agents.get(snapshot['agentId']);
      agents.set(snapshot['agentId'], {
        agentId: snapshot['agentId'],
        latestEquity: snapshot['equity'] ?? '0',
        latestCashBalance: snapshot['cashBalance'] ?? '0',
        latestExposurePct: snapshot['exposurePct'] ?? '0',
        filledOrders: existing?.filledOrders ?? 0,
        lastDecisionSummary: existing?.lastDecisionSummary ?? 'No decision yet.',
      });
    }

    if (row.type === 'PAPER_ORDER_FILLED') {
      const existing = agents.get(row.source) ?? {
        agentId: row.source,
        latestEquity: '0',
        latestCashBalance: '0',
        latestExposurePct: '0',
        filledOrders: 0,
        lastDecisionSummary: 'No decision yet.',
      };
      agents.set(row.source, { ...existing, filledOrders: existing.filledOrders + 1 });
    }

    if (row.type === 'AGENT_DECISION_RECEIVED') {
      const decision = payload['decision'] as { thesis?: { summary?: string } } | undefined;
      const agentId = String(payload['agentId'] ?? row.source);
      const existing = agents.get(agentId) ?? {
        agentId,
        latestEquity: '0',
        latestCashBalance: '0',
        latestExposurePct: '0',
        filledOrders: 0,
        lastDecisionSummary: 'No decision yet.',
      };
      agents.set(agentId, {
        ...existing,
        lastDecisionSummary: decision?.thesis?.summary ?? existing.lastDecisionSummary,
      });
    }
  }

  return [...agents.values()].sort((a, b) => a.agentId.localeCompare(b.agentId));
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendWsJson(ws: WebSocket, body: unknown): void {
  if (ws.readyState !== ws.OPEN) return;
  if (ws.bufferedAmount > 64 * 1024) {
    logger.warn({ bufferedAmount: ws.bufferedAmount }, 'dropping telemetry frame due to websocket backpressure');
    return;
  }
  ws.send(JSON.stringify(body));
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

const apiSrcDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(apiSrcDir, '../../..');
const migrationsFolder = path.join(workspaceRoot, 'packages/db/drizzle');
const DEFAULT_SYMBOL = 'BTC-USD';

function ensureApiDbMigrated(db: ArenaDb): void {
  migrate(db, { migrationsFolder });
}

function runDeterministicDemo(options: { db: ArenaDb; runId: string; agents?: PaperAgent[] }) {
  const { db, runId } = options;
  const agents = options.agents ?? createDemoPaperAgents();
  const ticks = createDemoTicks();
  const brokers = new Map<string, PaperBroker>();

  for (const agent of agents) {
    brokers.set(agent.agentId, new PaperBroker({
      runId,
      agentId: agent.agentId,
      startingBalance: '10000',
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
    const recentSignals = createDemoSignals(tickEvent, tickIndex);
    for (const signal of recentSignals) {
      appendEventPayload(db, {
        runId,
        type: 'STRATEGY_SIGNAL_CREATED',
        source: signal.strategyId,
        payload: signal as unknown as Record<string, unknown>,
        timestamp: signal.createdAt,
      });
    }

    for (const agent of agents) {
      const broker = mustGetBroker(brokers, agent.agentId);
      const observation = buildObservation({ agent, broker, tickEvent, runId, tickIndex, recentSignals, db });
      appendEventPayload(db, {
        runId,
        type: 'AGENT_DECISION_REQUESTED',
        source: agent.agentId,
        payload: {
          observationId: observation.observationId,
          agentId: agent.agentId,
          triggerReason: 'STRATEGY_SIGNAL_OR_TICK',
        },
        timestamp: tickEvent.exchangeTimestamp,
      });

      const decision = AgentDecisionSchema.parse(agent.decide(observation));
      appendDecision(db, runId, agent.agentId, observation.observationId, decision, tickEvent.exchangeTimestamp);
      applyDecisionThroughPaperBroker(broker, agent.agentId, decision, tickIndex);
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

function createDemoTicks(): NormalizedMarketEvent[] {
  return [
    createTick(0, '50000.00', '2026-01-01T00:00:00.000Z'),
    createTick(1, '50500.00', '2026-01-01T00:01:00.000Z'),
    createTick(2, '51000.00', '2026-01-01T00:02:00.000Z'),
  ];
}

function createDemoSignals(event: NormalizedMarketEvent, tickIndex: number): StrategySignal[] {
  if (tickIndex === 0) return [];
  return [{
    signalId: `sig-${event.eventId}`,
    strategyId: 'demo-momentum',
    strategyVersion: '0.1.0',
    inputEventId: event.eventId,
    symbol: event.symbol,
    signal: tickIndex === 1 ? 'long' : 'reduce_long',
    confidence: tickIndex === 1 ? 0.68 : 0.55,
    featuresUsed: ['demo_price_sequence', 'paper_only_fixture'],
    createdAt: event.exchangeTimestamp,
  }];
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

function appendDecision(db: ArenaDb, runId: string, agentId: string, observationId: string, decision: AgentDecision, timestamp: string): void {
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

function applyDecisionThroughPaperBroker(broker: PaperBroker, agentId: string, decision: AgentDecision, tickIndex: number): void {
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
  appendEventPayload(db, {
    runId,
    type: event.type,
    source: agentId,
    payload: event as unknown as Record<string, unknown>,
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
  recentSignals: StrategySignal[];
  db: ArenaDb;
}): AgentObservation {
  const { agent, broker, tickEvent, runId, tickIndex, recentSignals, db } = args;
  const timestamp = tickEvent.exchangeTimestamp;
  const portfolio = broker.getPortfolioSummary(timestamp);
  const riskState = buildRiskState(db, runId, agent.agentId, portfolio, timestamp);
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
    recentSignals,
    recentTrades: [],
    riskState,
    allowedActions: ['NOOP', 'PLACE_MARKET_ORDER'],
    allowedStrategies,
  });
}

function buildRiskState(db: ArenaDb, runId: string, agentId: string, portfolio: PortfolioSummary, timestamp: string): RiskState {
  return {
    runId,
    agentId,
    currentDrawdownPct: portfolio.currentDrawdownPct,
    maxDrawdownPct: '5',
    positionValueUsd: portfolio.totalPositionValue,
    totalExposurePct: portfolio.exposurePct,
    ordersThisMinute: countOrdersInWindow(db, runId, agentId, 60_000),
    strategySwitchesThisHour: countStrategySwitchesInWindow(db, runId, agentId, 3_600_000),
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

const isEntry = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntry) {
  const port = Number.parseInt(process.env['PORT'] ?? '8787', 10);
  const host = process.env['HOST'] ?? '127.0.0.1';
  const { server } = createApiServer({ port, host });
  server.listen(port, host, () => {
    logger.info({ port, host }, 'arena api listening');
  });
}
