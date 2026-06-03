import { useState } from 'react';
import type { WsStatus } from '../types.js';

export function RunControlsPanel({ initialRunId, apiBase, status, onRunChange }: { initialRunId: string; apiBase: string; status: WsStatus; onRunChange: (runId: string) => void }) {
  const [runId, setRunId] = useState(initialRunId);
  const [running, setRunning] = useState(true);

  async function start() {
    const response = await fetch(`${apiBase}/v1/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId }) });
    if (response.ok) { setRunning(true); onRunChange(runId); }
  }
  async function stop() {
    const response = await fetch(`${apiBase}/v1/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });
    if (response.ok) setRunning(false);
  }

  return (
    <section className="panel controls">
      <div className="panel-heading"><h2>Run controls</h2><span data-testid="ws-status-badge" className={`badge ${status}`}>{status}</span></div>
      <label>Active run<input value={runId} onChange={(event) => setRunId(event.target.value)} /></label>
      <p data-testid="active-run-id"><code>{runId}</code></p>
      <label>Strategy<select defaultValue="demo-momentum"><option value="demo-momentum">Demo Momentum</option><option value="do-nothing">Do Nothing</option></select></label>
      <div className="button-row"><button type="button" onClick={() => void start()} disabled={running}>Start</button><button type="button" onClick={() => void stop()} disabled={!running}>Stop</button></div>
    </section>
  );
}
