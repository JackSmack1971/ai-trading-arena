import type { ArenaTelemetry, WsStatus } from '../types.js';

export function AgentReasoningPanel({ telemetry, status }: { telemetry: ArenaTelemetry | null; status: WsStatus }) {
  const agents = telemetry?.agents ?? [];
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Agent reasoning</h2><span className={`badge ${status}`}>{status}</span></div>
      {agents.length === 0 ? <p>Waiting for agent decisions…</p> : agents.slice(0, 50).map((agent) => (
        <article data-testid="agent-decision-entry" className="decision" key={agent.agentId}>
          <strong>{agent.agentId}</strong>
          <p>{agent.lastDecisionSummary}</p>
          <small>Equity {agent.latestEquity} · Fills {agent.filledOrders}</small>
        </article>
      ))}
    </section>
  );
}
