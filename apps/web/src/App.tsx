import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AgentReasoningPanel } from './components/AgentReasoningPanel.js';
import { EquityCurvePanel } from './components/EquityCurvePanel.js';
import { PriceChartPanel } from './components/PriceChartPanel.js';
import { RunControlsPanel } from './components/RunControlsPanel.js';
import { useRun } from './hooks/useRun.js';
import { useSimulatorWs } from './hooks/useSimulatorWs.js';
import type { ArenaTelemetry } from './types.js';
import './styles.css';

const queryClient = new QueryClient();
const apiBase = import.meta.env['VITE_API_BASE'] ?? 'http://127.0.0.1:8787';
const defaultRunId = import.meta.env['VITE_RUN_ID'] ?? 'demo-local-paper-arena';

function Dashboard() {
  const [runId, setRunId] = useState(defaultRunId);
  const http = useRun(runId, apiBase);
  const ws = useSimulatorWs(runId, apiBase);
  const [telemetry, setTelemetry] = useState<ArenaTelemetry | null>(null);

  useEffect(() => { if (http.data) setTelemetry(http.data); }, [http.data]);
  useEffect(() => { if (ws.telemetry) setTelemetry(ws.telemetry); }, [ws.telemetry]);

  return (
    <main className="shell">
      <header className="hero"><p className="eyebrow">Local-first paper-trading simulator</p><h1>AI Trading Arena MVP Dashboard</h1></header>
      <div className="dashboard-grid">
        <RunControlsPanel initialRunId={runId} apiBase={apiBase} status={ws.status} onRunChange={setRunId} />
        <AgentReasoningPanel telemetry={telemetry} status={ws.status} />
        <PriceChartPanel telemetry={telemetry} />
        <EquityCurvePanel telemetry={telemetry} />
      </div>
    </main>
  );
}

export function App() {
  return <QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>;
}
