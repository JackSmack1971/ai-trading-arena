declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

interface ArenaTelemetry {
  runId: string;
  eventCount: number;
  hashChainValid: boolean;
  marketTicks: { timestamp: string; symbol: string; price: string }[];
  equity: { timestamp: string; agentId: string; equity: string; cashBalance: string; exposurePct: string }[];
  latestEvents: { seq: number; type: string; source: string; timestamp: string; payload: unknown }[];
  eventTypeCounts: Record<string, number>;
  agents: {
    agentId: string;
    latestEquity: string;
    latestCashBalance: string;
    latestExposurePct: string;
    filledOrders: number;
    lastDecisionSummary: string;
  }[];
}

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app mount target.');
}

const apiBase = import.meta.env['VITE_API_BASE'] ?? 'http://127.0.0.1:8787';
const runId = import.meta.env['VITE_RUN_ID'] ?? 'demo-local-paper-arena';

app.innerHTML = `
  <main class="shell" aria-labelledby="arena-title">
    <header class="hero">
      <div>
        <p class="eyebrow">Local-first paper-trading simulator</p>
        <h1 id="arena-title">AI Trading Arena MVP Dashboard</h1>
        <p class="lede">Live telemetry from feed → strategy signal → schema-validated agent decision → risk gate → paper broker.</p>
      </div>
      <button id="run-demo" type="button">Run deterministic demo</button>
    </header>

    <section class="status-grid" aria-label="Run status">
      <article><span>Run</span><strong id="run-id">${runId}</strong></article>
      <article><span>Events</span><strong id="event-count">—</strong></article>
      <article><span>Hash chain</span><strong id="hash-chain">—</strong></article>
      <article><span>WebSocket</span><strong id="socket-state">connecting</strong></article>
    </section>

    <section class="dashboard-grid">
      <article class="panel wide">
        <h2>Market price</h2>
        <div id="price-chart" class="chart" role="img" aria-label="Market price sparkline"></div>
      </article>
      <article class="panel wide">
        <h2>Agent equity</h2>
        <div id="equity-chart" class="chart" role="img" aria-label="Agent equity sparkline"></div>
      </article>
      <article class="panel">
        <h2>Agents</h2>
        <div id="agents"></div>
      </article>
      <article class="panel">
        <h2>Event tape</h2>
        <ol id="event-tape" class="event-tape"></ol>
      </article>
    </section>
  </main>
`;

const style = document.createElement('style');
style.textContent = `
  :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #020617; color: #e2e8f0; }
  body { margin: 0; background: radial-gradient(circle at top left, rgba(14,165,233,.25), transparent 32rem), #020617; }
  .shell { max-width: 1180px; margin: 0 auto; padding: 32px; }
  .hero { display: flex; justify-content: space-between; gap: 24px; align-items: center; margin-bottom: 24px; }
  .eyebrow { color: #38bdf8; font-size: 0.76rem; letter-spacing: .14em; margin: 0 0 8px; text-transform: uppercase; }
  h1 { font-size: clamp(2rem, 6vw, 4.5rem); line-height: .95; margin: 0; }
  h2 { margin: 0 0 16px; font-size: 1rem; color: #bae6fd; }
  .lede { color: #cbd5e1; max-width: 54rem; line-height: 1.6; }
  button { border: 0; border-radius: 999px; background: #38bdf8; color: #082f49; font-weight: 800; padding: 12px 18px; cursor: pointer; box-shadow: 0 16px 40px rgba(56,189,248,.25); }
  .status-grid, .dashboard-grid { display: grid; gap: 16px; }
  .status-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 16px; }
  .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  article { border: 1px solid rgba(148,163,184,.2); border-radius: 20px; background: rgba(15,23,42,.74); box-shadow: 0 20px 80px rgba(0,0,0,.25); }
  .status-grid article { padding: 16px; }
  .status-grid span { display: block; color: #94a3b8; font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
  .status-grid strong { display: block; margin-top: 8px; font-size: 1.2rem; word-break: break-word; }
  .panel { padding: 20px; min-height: 260px; }
  .wide { min-height: 320px; }
  .chart { min-height: 240px; display: grid; align-items: end; grid-auto-flow: column; gap: 6px; border-bottom: 1px solid rgba(148,163,184,.25); padding-top: 16px; }
  .bar { background: linear-gradient(180deg, #22d3ee, #2563eb); border-radius: 8px 8px 0 0; min-width: 18px; position: relative; }
  .bar.equity { background: linear-gradient(180deg, #a78bfa, #7c3aed); }
  .agent-card { border: 1px solid rgba(148,163,184,.16); border-radius: 16px; padding: 14px; margin-bottom: 12px; background: rgba(2,6,23,.45); }
  .agent-card strong { display:block; color:#f8fafc; }
  .agent-card p, .agent-card dl { margin: 8px 0 0; color: #cbd5e1; }
  .agent-card dl { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; }
  .agent-card dt { color:#94a3b8; font-size:.72rem; text-transform:uppercase; }
  .agent-card dd { margin:0; font-weight:700; }
  .event-tape { margin:0; padding-left: 20px; max-height: 300px; overflow:auto; color:#cbd5e1; }
  .event-tape li { margin-bottom: 10px; }
  code { color: #67e8f9; }
  @media (max-width: 820px) { .hero { align-items: start; flex-direction: column; } .status-grid, .dashboard-grid { grid-template-columns: 1fr; } }
`;
document.head.append(style);

document.querySelector<HTMLButtonElement>('#run-demo')?.addEventListener('click', async () => {
  await fetch(`${apiBase}/api/demo/run?runId=${encodeURIComponent(runId)}`, { method: 'POST' });
  await refreshTelemetry();
});

async function refreshTelemetry(): Promise<void> {
  const response = await fetch(`${apiBase}/api/runs/${encodeURIComponent(runId)}/telemetry`);
  renderTelemetry(await response.json() as ArenaTelemetry);
}

function connectTelemetrySocket(): void {
  const wsBase = apiBase.replace(/^http/, 'ws');
  const socket = new WebSocket(`${wsBase}/ws/runs/${encodeURIComponent(runId)}/telemetry`);
  const state = document.querySelector<HTMLElement>('#socket-state');
  socket.addEventListener('open', () => { if (state) state.textContent = 'live'; });
  socket.addEventListener('close', () => {
    if (state) state.textContent = 'reconnecting';
    window.setTimeout(connectTelemetrySocket, 2_000);
  });
  socket.addEventListener('message', (event) => {
    const envelope = JSON.parse(String(event.data)) as { type: string; data: ArenaTelemetry };
    if (envelope.type === 'telemetry.snapshot') renderTelemetry(envelope.data);
  });
}

function renderTelemetry(data: ArenaTelemetry): void {
  setText('#run-id', data.runId);
  setText('#event-count', String(data.eventCount));
  setText('#hash-chain', data.hashChainValid ? 'valid' : 'invalid');
  renderBars('#price-chart', data.marketTicks.map((point) => Number(point.price)), 'bar');
  renderBars('#equity-chart', data.equity.map((point) => Number(point.equity)), 'bar equity');
  renderAgents(data);
  renderEvents(data);
}

function renderBars(selector: string, values: number[], className: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) return;
  const safeValues = values.filter((value) => Number.isFinite(value));
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = Math.max(max - min, 1);
  node.innerHTML = safeValues.map((value) => {
    const height = 18 + ((value - min) / range) * 210;
    return `<span class="${className}" title="${value.toFixed(2)}" style="height:${height}px"></span>`;
  }).join('') || '<p>No chart points yet.</p>';
}

function renderAgents(data: ArenaTelemetry): void {
  const node = document.querySelector<HTMLElement>('#agents');
  if (!node) return;
  node.innerHTML = data.agents.map((agent) => `
    <section class="agent-card">
      <strong>${agent.agentId}</strong>
      <dl>
        <div><dt>Equity</dt><dd>$${agent.latestEquity}</dd></div>
        <div><dt>Cash</dt><dd>$${agent.latestCashBalance}</dd></div>
        <div><dt>Fills</dt><dd>${agent.filledOrders}</dd></div>
      </dl>
      <p>${agent.lastDecisionSummary}</p>
    </section>
  `).join('') || '<p>No agents yet.</p>';
}

function renderEvents(data: ArenaTelemetry): void {
  const node = document.querySelector<HTMLElement>('#event-tape');
  if (!node) return;
  node.innerHTML = data.latestEvents.slice(-12).reverse().map((event) => `
    <li><code>#${event.seq} ${event.type}</code><br><span>${event.source} · ${event.timestamp}</span></li>
  `).join('');
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

void refreshTelemetry().catch(() => setText('#socket-state', 'api unavailable'));
connectTelemetrySocket();
