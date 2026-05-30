**a local-first AI trading arena**, not a live-trading bot. 
The agents can analyze, switch strategies, place simulated orders, cancel/amend orders, manage risk, and explain trade theses, but the repo contains **no real execution adapter**.

The key design choice: **deterministic simulator core + AI strategic controllers**. Do not call an LLM on every tick. Let deterministic strategies process every tick/bar/order-book event, then let the agents intervene on a cadence or trigger: “new breakout,” “drawdown breach,” “spread anomaly,” “volatility regime changed,” etc. That keeps costs low, respects free-model limits, makes the sim replayable, and gives you better telemetry.

## Current grounding

OpenRouter is a good fit because it exposes many models through one OpenAI-compatible API, supports chat completions, model listing, structured outputs, and tool/function calling. The app should fetch `/api/v1/models`, filter free candidates dynamically, and allow `openrouter/free` as a fallback router. OpenRouter’s free router randomly selects from available free models and filters for capabilities such as structured outputs and tool calling, which is useful for onboarding but less ideal for reproducible agent-vs-agent experiments. For scientific comparisons, pin explicit `:free` model IDs per agent when possible. ([OpenRouter][1])

For no-auth/zero-auth data feeds, crypto and prediction-market data are the best starting points. Coinbase Exchange market-data WebSockets are publicly available without authentication; Binance Spot WebSocket streams have explicit connection/message limits; Kraken public market-data feeds do not require auth; Polymarket exposes public market data and read endpoints without authentication; DexScreener has public REST endpoints with documented 60/min and 300/min rate-limit classes. ([Coinbase Developer Docs][2])

---

# Atomic blueprint: AI Trading Simulator Arena

## 1. Product definition

Build a **local paper-trading research lab** where two AI agents compete over the same live market feed.

Each agent has:

* Its own OpenRouter model selection.
* Its own system prompt/personality.
* A starting paper balance.
* Strategy modules it can use, switch, pause, or combine.
* A simulated order book / paper broker.
* A full event log.
* A visible trade thesis for every action.
* Telemetry captured for later study.

The app should support:

* Live feed ingestion.
* Historical replay.
* Paper trading.
* Agent-vs-agent competitions.
* Strategy hot-loading.
* Agent telemetry.
* UI onboarding for OpenRouter API key.
* Dashboard visualizations.
* Exportable research logs.

Do **not** build:

* Real broker integration.
* Private-key signing.
* Wallet connection.
* Exchange account connection.
* Actual order placement.
* Any hidden “future live-trading mode” unless it is explicitly isolated behind a separate package later.

---

# 2. Recommended stack

Use a **TypeScript monorepo**.

```txt
trader-arena/
  apps/
    web/              # React/Vite dashboard
    api/              # Fastify local API + WebSocket server
    worker/           # Long-running simulation engine
  packages/
    core/             # domain types, event model, simulator
    broker-paper/     # paper broker, fills, slippage, fees
    feeds/            # Binance, Coinbase, Kraken, Polymarket, DexScreener
    agents/           # OpenRouter client, prompts, decision schemas
    strategies/       # built-in strategy SDK
    telemetry/        # logging, metrics, traces, exports
    db/               # SQLite schema, migrations, repositories
    ui/               # shared UI components
  strategies/
    examples/
      momentum-basic/
      mean-reversion-basic/
      orderbook-imbalance/
      polymarket-spread/
  docs/
  scripts/
  tests/
  .env.example
  AGENTS.md
  README.md
```

Use:

* **React + Vite** for the dashboard.
* **Fastify** for the local API.
* **WebSocket or Socket.IO** for live UI updates.
* **Worker process** for simulation so it does not die with frontend requests.
* **SQLite** for local persistence.
* **Drizzle ORM** or direct SQL for transparent schema control.
* **Zod** for schemas.
* **Pino** for structured logs.
* **Vitest** for unit tests.
* **Playwright** for dashboard flows.
* **Lightweight Charts or Recharts** for visuals.
* **OpenTelemetry-style event naming**, even if stored locally first.

---

# 3. Core architecture

```txt
Live Feeds
   ↓
Feed Adapters
   ↓
Normalizer
   ↓
Event Bus
   ↓
Feature Builder
   ↓
Strategy Engine
   ↓
Agent Controller
   ↓
Risk Gate
   ↓
Paper Broker
   ↓
Ledger / Telemetry / Dashboard
```

The simulator should be **event-sourced**.

That means every important action becomes an immutable event:

```txt
MARKET_TICK_RECEIVED
ORDERBOOK_UPDATED
BAR_CLOSED
STRATEGY_SIGNAL_CREATED
AGENT_DECISION_REQUESTED
AGENT_DECISION_RECEIVED
RISK_CHECK_PASSED
RISK_CHECK_REJECTED
PAPER_ORDER_CREATED
PAPER_ORDER_AMENDED
PAPER_ORDER_CANCELLED
PAPER_ORDER_FILLED
POSITION_UPDATED
PNL_SNAPSHOT_CREATED
STRATEGY_SWITCHED
RATE_LIMIT_DELAYED
FEED_DISCONNECTED
FEED_RECONNECTED
```

The dashboard should read from materialized state, but the source of truth is the event log.

---

# 4. Repo initialization plan

From an empty folder:

```bash
mkdir trader-arena
cd trader-arena

git init -b main
corepack enable
pnpm init

mkdir -p apps/web apps/api apps/worker packages/core packages/feeds packages/agents packages/strategies packages/broker-paper packages/telemetry packages/db packages/ui strategies/examples docs scripts tests
```

Then add:

```txt
.gitignore
.env.example
README.md
AGENTS.md
package.json
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
prettier.config.js
```

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:web": "pnpm --filter @arena/web dev",
    "dev:api": "pnpm --filter @arena/api dev",
    "dev:worker": "pnpm --filter @arena/worker dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "db:migrate": "pnpm --filter @arena/db migrate",
    "strategy:create": "tsx scripts/create-strategy.ts",
    "sim:replay": "pnpm --filter @arena/worker replay"
  }
}
```

---

# 5. Onboarding flow

The first-run UI should walk the user through five steps.

## Step 1: OpenRouter key

User enters API key.

Backend does:

1. Accept key over local HTTPS or localhost-only HTTP.
2. Validate by calling OpenRouter model list.
3. Store encrypted locally.
4. Never expose it back to the frontend.
5. Log only key fingerprint, never the key.

Store:

```txt
provider: openrouter
key_fingerprint: sha256_last_8
encrypted_secret
created_at
last_validated_at
```

Use OpenRouter’s model listing endpoint to populate model choices dynamically instead of hardcoding free models. ([OpenRouter][1])

## Step 2: Choose agent models

User configures:

```txt
Agent A:
  name: Bull
  model: selected :free model or openrouter/free
  temperature: 0.2
  max tokens: 800
  decision cadence: 30s

Agent B:
  name: Bear
  model: selected :free model or openrouter/free
  temperature: 0.2
  max tokens: 800
  decision cadence: 30s
```

For serious experiments, recommend pinned models. For casual fun, allow `openrouter/free`.

## Step 3: Choose market universe

MVP options:

```txt
Crypto CEX:
  BTC-USD / BTCUSDT
  ETH-USD / ETHUSDT
  SOL-USD / SOLUSDT

Prediction markets:
  selected Polymarket markets

DEX tokens:
  selected DexScreener pairs
```

## Step 4: Choose strategy packs

Each agent gets:

```txt
Allowed strategies:
  momentum-basic
  mean-reversion-basic
  orderbook-imbalance
  volatility-breakout
  do-nothing-baseline
```

Agents can switch strategy mid-run, but every switch must be logged.

## Step 5: Start simulation

User chooses:

```txt
Starting paper balance: $10,000
Max position size: 10%
Max daily drawdown: 5%
Fee model: exchange-specific or generic
Slippage model: spread-based
Run duration: manual / 15m / 1h / 4h
```

---

# 6. Data-feed policy

Default rule: **no private endpoints, no trade endpoints, no account endpoints.**

## Feed adapter interface

```ts
export interface MarketFeedAdapter {
  id: string;
  name: string;
  authRequired: false;
  capabilities: FeedCapability[];
  ratePolicy: RatePolicy;

  connect(config: FeedConfig): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): Promise<void>;

  onEvent(handler: (event: NormalizedMarketEvent) => void): void;
}
```

## Recommended feed adapters

### Coinbase public WebSocket

Use for clean BTC/ETH/SOL style pairs. Coinbase Exchange WebSocket market data is publicly available and the traditional market data endpoint is available without authentication. ([Coinbase Developer Docs][2])

### Binance Spot WebSocket

Use for high-liquidity crypto symbols. Respect documented WebSocket limits: Binance states WebSocket connections have a 5 incoming messages/second limit, and the WebSocket API docs also list a 300 connection-attempts-per-5-minutes-per-IP limit. Use one combined stream, subscribe once, and do not churn connections. ([Binance Developers][3])

### Kraken public WebSocket

Use as redundant or alternate crypto source. Kraken documents that public market-data feeds do not require authentication, while private feeds require auth tokens. ([Kraken Support][4])

### Polymarket public data

Use for prediction-market mode. Polymarket docs state public market data is available through public REST endpoints with no API key, authentication, or wallet required, and the CLOB read endpoints are public/no-auth. ([Polymarket Documentation][5])

### DexScreener REST

Use for DEX token snapshots, not high-frequency tick simulation. DexScreener documents 60 requests/minute for some token/profile endpoints and 300 requests/minute for pair/search endpoints. ([DEX Screener Docs][6])

---

# 7. Rate-limit architecture

Every feed must declare its own `RatePolicy`.

```ts
export interface RatePolicy {
  provider: string;
  limits: Array<{
    scope: "connection" | "subscription" | "request" | "message";
    max: number;
    intervalMs: number;
  }>;
  backoff: {
    initialMs: number;
    maxMs: number;
    jitter: boolean;
  };
}
```

Rules:

1. Token bucket per provider.
2. Token bucket per endpoint/channel.
3. Backoff on `429`, disconnect, throttling, or Cloudflare delay.
4. UI shows rate-limit health.
5. All rate-limit delays are logged.
6. No bypassing, scraping, rotating IPs, or hidden retries.

Dashboard widget:

```txt
Feed Health
  Coinbase: connected
  Binance: connected, 1 stream, 2 symbols
  Kraken: standby
  Polymarket: disconnected
  DexScreener: 42 / 300 rpm remaining
```

---

# 8. Strategy system

Use two levels:

## Level 1: Declarative strategy DSL

Best for normal users.

Example:

```yaml
id: momentum-basic
name: Momentum Basic
version: 0.1.0
inputs:
  symbols: ["BTC-USD"]
  timeframe: "1m"
rules:
  - when:
      indicator: ema_cross
      fast: 9
      slow: 21
      direction: bullish
    emit:
      signal: long
      confidence: 0.62
  - when:
      indicator: rsi
      period: 14
      operator: ">"
      value: 72
    emit:
      signal: reduce_long
      confidence: 0.55
risk:
  max_position_pct: 0.1
```

## Level 2: TypeScript strategy pack

For advanced users.

```ts
export interface Strategy {
  id: string;
  version: string;

  onStart(ctx: StrategyContext): Promise<void> | void;

  onMarketEvent(
    event: NormalizedMarketEvent,
    ctx: StrategyContext
  ): Promise<StrategySignal[]> | StrategySignal[];

  onPositionUpdate?(
    update: PositionUpdate,
    ctx: StrategyContext
  ): Promise<StrategySignal[]> | StrategySignal[];
}
```

Strategy packs live in:

```txt
strategies/my-strategy/
  manifest.yaml
  strategy.ts
  README.md
  tests/
```

Manifest:

```yaml
id: orderbook-imbalance
name: Order Book Imbalance
version: 0.1.0
entry: strategy.ts
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
```

Strategies should emit **signals**, not orders. Agents or deterministic policy convert signals into trade intents.

---

# 9. Agent system

Agents are not raw chatbots. They are constrained decision engines.

## Agent input packet

Every agent decision receives the same type of packet:

```ts
export interface AgentObservation {
  runId: string;
  agentId: string;
  timestamp: string;
  marketState: MarketStateSummary;
  portfolio: PortfolioSummary;
  openOrders: PaperOrder[];
  recentSignals: StrategySignal[];
  recentTrades: TradeSummary[];
  riskState: RiskState;
  allowedActions: AgentActionName[];
  allowedStrategies: StrategyDescriptor[];
}
```

## Agent output schema

Use OpenRouter structured outputs where supported so the app gets parseable decisions. OpenRouter documents structured outputs via JSON Schema for compatible models. ([OpenRouter][7])

```ts
export interface AgentDecision {
  action:
    | "NOOP"
    | "PLACE_MARKET_ORDER"
    | "PLACE_LIMIT_ORDER"
    | "AMEND_ORDER"
    | "CANCEL_ORDER"
    | "CLOSE_POSITION"
    | "SWITCH_STRATEGY"
    | "REDUCE_EXPOSURE";

  symbol?: string;
  side?: "BUY" | "SELL";
  quantityUsd?: number;
  limitPrice?: number;
  orderId?: string;
  newStrategyId?: string;

  confidence: number;

  thesis: {
    summary: string;
    evidence: string[];
    invalidation: string;
    expectedHoldingPeriod: string;
  };

  risk: {
    maxLossUsd: number;
    stopPrice?: number;
    takeProfitPrice?: number;
  };
}
```

Important: show **trade thesis**, not hidden chain-of-thought. The UI should display:

```txt
Agent thesis:
“BTC momentum remains positive after a 9/21 EMA cross, but spread widened.
I am placing a small limit buy below midpoint rather than crossing the spread.”

Evidence:
- EMA 9 crossed above EMA 21
- 1m volume above 20-bar average
- Current spread: 4.2 bps

Invalidation:
- Close below EMA 21 or drawdown above $35
```

---

# 10. Agent permissions

Agents may:

```txt
Read market summaries
Read indicators
Read order book summaries
Read own portfolio
Read opponent public scoreboard
Request strategy switch
Request simulated order
Cancel/amend simulated order
Reduce exposure
Close simulated position
Write a trade thesis
```

Agents may not:

```txt
Access OpenRouter API key
Access filesystem
Access raw secrets
Call arbitrary URLs
Use private exchange APIs
Place real orders
Connect wallets
Create brokerage credentials
Disable risk engine
Alter historical logs
Modify opponent state
```

All agent actions go through a **risk gate**.

---

# 11. Paper broker

The paper broker should simulate:

```txt
Market orders
Limit orders
Stop orders
Stop-limit orders
Trailing stops
OCO-style paired exits
Cancel/replace
Partial fills
Fees
Slippage
Spread crossing
Latency
Insufficient balance rejection
Position accounting
Realized P&L
Unrealized P&L
```

Do not make fills too generous. The paper broker should use:

```txt
Best bid/ask if order-book feed exists
Midpoint + configurable slippage if only ticker feed exists
Volume-aware partial fills if depth exists
Fee model per venue
Latency model per simulation profile
```

Fill event:

```ts
export interface PaperFill {
  fillId: string;
  orderId: string;
  agentId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fee: number;
  slippageBps: number;
  liquiditySource: string;
  timestamp: string;
}
```

---

# 12. Risk engine

Risk engine is non-AI and always final.

Hard rules:

```txt
Max position size
Max symbol exposure
Max total exposure
Max drawdown
Max order count per minute
Max strategy switches per hour
No negative cash unless margin mode explicitly enabled
No leverage in MVP
No real execution
```

Risk rejection example:

```json
{
  "event": "RISK_CHECK_REJECTED",
  "agentId": "agent_b",
  "reason": "quantityUsd exceeds max_position_pct",
  "requested": 2500,
  "allowed": 1000
}
```

---

# 13. Dashboard design

Make the dashboard feel like a competitive arena.

## Main panels

```txt
Top Bar
  Run status
  Feed health
  Elapsed time
  Current market
  Rate-limit status

Scoreboard
  Agent A equity
  Agent B equity
  P&L delta
  Win probability estimate
  Current leader

Market View
  Candlestick chart
  Volume
  Spread
  Order book depth
  Recent trades

Agent Cards
  Model
  Current strategy
  Cash
  Position
  Exposure
  Drawdown
  Last decision
  Confidence

Trade Tape
  Timestamp
  Agent
  Action
  Symbol
  Side
  Size
  Price
  Fill status
  Thesis button

Reasoning Timeline
  Agent decisions
  Strategy switches
  Risk rejections
  Major market events

Telemetry
  LLM latency
  Token usage
  Model errors
  Schema failures
  Rate-limit delays
```

## Metrics

Per agent:

```txt
Equity
Realized P&L
Unrealized P&L
Total return %
Max drawdown
Win rate
Average win
Average loss
Profit factor
Sharpe-like score
Sortino-like score
Exposure
Turnover
Fees paid
Slippage paid
Number of trades
Number of rejected actions
Number of strategy switches
Average decision latency
Token usage
Schema-valid decision rate
```

## Visualizations

```txt
Equity curve: Agent A vs Agent B
Drawdown chart
Position exposure over time
Trade markers on price chart
Strategy regime timeline
P&L attribution by symbol
Fees/slippage chart
Agent confidence vs outcome scatterplot
Model latency over time
```

---

# 14. Database schema

Use SQLite.

Core tables:

```sql
settings
secrets
sim_runs
agents
agent_configs
feed_sources
instruments
market_events
bars
orderbook_snapshots
strategy_packs
strategy_signals
agent_decisions
paper_orders
paper_fills
positions
pnl_snapshots
risk_events
llm_calls
telemetry_events
rate_limit_events
audit_log
```

The most important table is `events`.

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  previous_hash TEXT,
  created_at TEXT NOT NULL
);
```

This gives you replayability and tamper-evident logs.

---

# 15. Telemetry capture

Log every LLM call:

```txt
run_id
agent_id
model
provider
prompt_version
schema_version
input_token_estimate
output_token_estimate
latency_ms
status
error_code
raw_response_hash
parsed_decision
schema_valid
repair_attempted
```

Log every strategy signal:

```txt
strategy_id
strategy_version
input_event_id
signal_type
symbol
confidence
features_used
created_at
```

Log every trade decision:

```txt
agent_id
observation_id
decision_json
thesis_summary
risk_status
resulting_order_id
created_at
```

Log every feed event:

```txt
provider
symbol
event_type
received_at
exchange_timestamp
latency_ms
normalized_payload_hash
```

Add export formats:

```txt
JSONL
CSV
SQLite copy
Parquet later
```

---

# 16. Simulation loop

Pseudo-flow:

```txt
1. Feed emits market event.
2. Normalizer converts provider payload into canonical event.
3. Event bus appends MARKET_* event.
4. Feature builder updates bars, indicators, order-book summaries.
5. Strategy engine emits signals.
6. Agent scheduler decides whether agent should think now.
7. Agent receives compact observation packet.
8. OpenRouter returns structured decision.
9. Decision schema is validated.
10. Risk gate approves/rejects.
11. Paper broker simulates order/fill.
12. Positions and P&L update.
13. Dashboard receives real-time update.
14. Everything is logged.
```

Agent decision triggers:

```txt
Every N seconds
On bar close
On major price move
On strategy signal
On drawdown threshold
On opponent taking lead
On feed reconnect
On volatility regime change
```

---

# 17. Built-in strategies for MVP

Start with simple strategies so the system is testable.

```txt
do-nothing-baseline
  Emits no trades. Used as sanity check.

momentum-basic
  EMA crossover + volume confirmation.

mean-reversion-basic
  RSI / z-score deviation from rolling mean.

volatility-breakout
  ATR expansion + range breakout.

orderbook-imbalance
  Bid/ask depth imbalance with spread guard.

spread-capture-paper
  Only for order-book markets. Places passive paper limits.

polymarket-midpoint-drift
  Tracks midpoint, spread, and recent trade movement.
```

Each strategy should have tests with synthetic market events.

---

# 18. OpenRouter integration design

Package:

```txt
packages/agents/src/openrouter/
  client.ts
  models.ts
  schemas.ts
  prompts.ts
  decision-request.ts
  decision-parser.ts
  retries.ts
```

Model discovery:

```ts
async function listFreeOpenRouterModels(apiKey: string) {
  const models = await getModels(apiKey);

  return models.filter((m) => {
    const promptFree = Number(m.pricing?.prompt ?? 1) === 0;
    const completionFree = Number(m.pricing?.completion ?? 1) === 0;
    const idLooksFree = m.id.includes(":free");
    return promptFree && completionFree || idLooksFree;
  });
}
```

Decision handling:

```txt
Try structured output.
If schema invalid, attempt one repair call.
If repair fails, emit AGENT_DECISION_INVALID.
Invalid decisions become NOOP.
Never let malformed output reach broker.
```

Prompt rule:

```txt
You are a paper-trading agent in a simulator.
You cannot execute real trades.
You must return only valid JSON matching the schema.
Use concise thesis bullets.
Respect risk limits.
Do not request tools outside the allowed action list.
```

---

# 19. Security and privacy

Key rules:

```txt
Never store API keys in localStorage.
Never log API keys.
Never send API keys to frontend after save.
Encrypt local secrets.
Show only key fingerprint.
Allow deleting key from UI.
Allow running app with mock LLM mode.
```

Recommended secret storage:

```txt
Primary: OS credential manager through backend.
Fallback: encrypted SQLite secret using user passphrase.
Dev fallback: .env only, never committed.
```

`.env.example`:

```bash
DATABASE_URL="file:./data/arena.sqlite"
OPENROUTER_API_KEY=""
LOG_LEVEL="info"
ALLOW_REAL_TRADING="false"
```

Hardcode:

```ts
export const REAL_TRADING_ENABLED = false as const;
```

Do not create a hidden config flag that enables real trading.

---

# 20. Testing plan

## Unit tests

```txt
Market normalization
Rate limiter
Strategy signals
Agent output schema validation
Risk gate
Paper broker fills
PnL accounting
Event append order
Replay determinism
```

## Integration tests

```txt
Mock feed → strategy → agent mock → paper broker → dashboard event
OpenRouter model list with mocked response
Feed disconnect/reconnect
Rate limit backoff
Invalid LLM JSON becomes NOOP
Risk rejection does not create order
```

## Replay tests

Every sim run should be replayable:

```txt
Given event log X
When replayed
Then final balances, positions, orders, and P&L match exactly
```

This is critical for studying agents later.

---

# 21. Atomic implementation phases

## Phase 0 — Repository skeleton

* Initialize git.
* Add pnpm workspace.
* Add TypeScript config.
* Add lint/format/test tooling.
* Add `AGENTS.md`.
* Add `README.md`.
* Add `.env.example`.
* Add basic package boundaries.

Exit criteria:

```txt
pnpm install works
pnpm lint works
pnpm test works
empty apps boot
```

## Phase 1 — Domain model

* Define `MarketEvent`.
* Define `Instrument`.
* Define `Agent`.
* Define `StrategySignal`.
* Define `PaperOrder`.
* Define `PaperFill`.
* Define `Position`.
* Define `PnLSnapshot`.
* Define `AgentDecision`.
* Define `RiskEvent`.

Exit criteria:

```txt
All domain types compile
Zod schemas validate sample payloads
```

## Phase 2 — Event store

* Create SQLite schema.
* Add append-only event writer.
* Add sequence numbers.
* Add payload hashes.
* Add replay reader.
* Add event projection stubs.

Exit criteria:

```txt
Events append in order
Replay returns identical event sequence
```

## Phase 3 — Paper broker

* Implement cash ledger.
* Implement market orders.
* Implement limit orders.
* Implement cancel orders.
* Implement fills.
* Implement fees.
* Implement slippage.
* Implement positions.
* Implement P&L snapshots.

Exit criteria:

```txt
Synthetic buy/sell tests pass
Partial fill test passes
PnL math test passes
```

## Phase 4 — Strategy SDK

* Add strategy interface.
* Add manifest schema.
* Add strategy loader.
* Add built-in do-nothing strategy.
* Add built-in momentum strategy.
* Add built-in mean reversion strategy.
* Add strategy test harness.

Exit criteria:

```txt
User can add strategy folder
App discovers valid strategy
Invalid strategy is rejected
```

## Phase 5 — Feed manager

* Implement normalized feed interface.
* Add mock feed first.
* Add Coinbase public feed.
* Add Binance feed.
* Add Kraken feed.
* Add provider-specific rate policies.
* Add reconnect logic.
* Add feed health events.

Exit criteria:

```txt
Mock feed runs deterministic sim
One real public feed streams into event bus
Rate-limit telemetry appears
```

## Phase 6 — OpenRouter onboarding

* Add settings table.
* Add encrypted secret storage.
* Add onboarding UI.
* Add key validation.
* Add model list fetch.
* Add free-model filter.
* Add agent model picker.

Exit criteria:

```txt
User enters key once
Model list loads
Key is not exposed back to UI
Agent config persists
```

## Phase 7 — Agent decision engine

* Add agent prompt template.
* Add observation builder.
* Add structured output schema.
* Add OpenRouter chat call.
* Add schema validation.
* Add repair attempt.
* Add invalid-output NOOP fallback.
* Add LLM telemetry.

Exit criteria:

```txt
Mock agent can place paper order
OpenRouter agent can return valid decision
Malformed decision cannot affect broker
```

## Phase 8 — Risk gate

* Add max position.
* Add max drawdown.
* Add max orders/min.
* Add max strategy switches.
* Add no-leverage default.
* Add risk rejection events.

Exit criteria:

```txt
Oversized order rejected
Rejected order never reaches broker
Dashboard shows rejection reason
```

## Phase 9 — Dashboard MVP

* Add run control.
* Add feed health panel.
* Add scoreboard.
* Add equity curve.
* Add trade tape.
* Add agent cards.
* Add reasoning drawer.
* Add telemetry panel.

Exit criteria:

```txt
User can start/stop sim
User can watch both agents compete
User can inspect every trade thesis
```

## Phase 10 — Research exports

* Export run as JSONL.
* Export trades as CSV.
* Export decisions as CSV.
* Export telemetry as JSONL.
* Add replay command.

Exit criteria:

```txt
Completed run can be exported and replayed
```

---

# 22. `AGENTS.md` for coding agents

Put this in the repo root:

```md
# AGENTS.md

This repository is a local-first AI paper-trading simulator.

Hard rules:
- Never add real trade execution.
- Never add brokerage, wallet, private-key, or exchange-account order placement.
- Never log API keys or secrets.
- Never store API keys in browser localStorage.
- Market data adapters must use public/free/no-auth endpoints unless explicitly marked optional.
- All provider rate limits must be respected.
- All state-changing simulator actions must emit events.
- Paper broker state must be derived from event-sourced records.
- Agent decisions must be schema-validated before reaching the risk gate.
- Risk gate is final authority.
- Invalid LLM output becomes NOOP.
- Every trade must have a visible thesis summary.
- Hidden chain-of-thought is not required or stored.
- Tests are required for broker math, risk rejection, strategy loading, and replay determinism.

Architecture:
- apps/web: React dashboard.
- apps/api: local API and WebSocket server.
- apps/worker: simulation runtime.
- packages/core: domain model and event types.
- packages/feeds: public market-data adapters.
- packages/agents: OpenRouter integration.
- packages/broker-paper: simulated orders/fills/PnL.
- packages/strategies: strategy SDK.
- packages/telemetry: logs, metrics, exports.
- packages/db: SQLite schema and repositories.
```

---

# 23. MVP scope

Build this first:

```txt
Two agents
One market: BTC-USD or BTCUSDT
One live feed
One mock feed
Two strategies
Paper market/limit orders
Risk gate
OpenRouter onboarding
Model picker
Trade thesis display
Equity curve
Trade tape
SQLite event log
JSONL export
Replay command
```

Do **not** start with every feed, every market, and every visualization. Get one complete loop working:

```txt
feed → strategy → agent → risk → paper broker → telemetry → dashboard → replay
```

Once that loop is solid, adding more feeds and strategies becomes straightforward.

---

# 24. North-star version

The polished version becomes:

```txt
AI Trading Arena
  Two or more agents compete live.
  Users can create strategy packs.
  Agents can switch strategy mid-run.
  Every action is logged.
  Every trade has a thesis.
  Every run can be replayed.
  Every model can be compared.
  Every feed follows public/free/no-auth policies.
  No real money can ever be touched.
```

That is the safest, most extensible, and most research-useful version of the idea.