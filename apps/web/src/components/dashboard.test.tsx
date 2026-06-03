import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentReasoningPanel } from './AgentReasoningPanel.js';
import { EquityCurvePanel } from './EquityCurvePanel.js';
import { PriceChartPanel } from './PriceChartPanel.js';
import { RunControlsPanel } from './RunControlsPanel.js';

vi.mock('lightweight-charts', () => ({
  LineSeries: 'LineSeries',
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn(), update: vi.fn() })),
    remove: vi.fn(),
  })),
}));

const telemetry = {
  runId: 'run-test', eventCount: 3, hashChainValid: true,
  marketTicks: [{ timestamp: '2026-01-01T00:00:00.000Z', symbol: 'BTC-USD', price: '50000.00' }],
  equity: [{ timestamp: '2026-01-01T00:00:00.000Z', agentId: 'agent-a', equity: '10000.00', cashBalance: '10000.00', exposurePct: '0' }],
  latestEvents: [], eventTypeCounts: {},
  agents: [{ agentId: 'agent-a', latestEquity: '10000.00', latestCashBalance: '10000.00', latestExposurePct: '0', filledOrders: 0, lastDecisionSummary: 'NOOP fixture decision' }],
};

describe('dashboard panels', () => {
  it('renders price chart and agent reasoning panels', () => {
    render(<><PriceChartPanel telemetry={telemetry} /><AgentReasoningPanel telemetry={telemetry} status="open" /></>);
    expect(screen.getByTestId('price-chart-panel')).toBeVisible();
    expect(screen.getByTestId('agent-decision-entry')).toHaveTextContent('NOOP fixture decision');
  });

  it('renders equity curve and run controls', () => {
    render(<><EquityCurvePanel telemetry={telemetry} /><RunControlsPanel initialRunId="run-test" apiBase="http://localhost:8787" status="open" onRunChange={() => undefined} /></>);
    expect(screen.getByTestId('equity-curve-panel')).toBeVisible();
    expect(screen.getByTestId('ws-status-badge')).toHaveTextContent('open');
    expect(screen.getByTestId('active-run-id')).toHaveTextContent('run-test');
  });
});
