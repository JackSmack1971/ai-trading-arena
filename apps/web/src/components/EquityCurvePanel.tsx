import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, toEquitySeries } from '../chart-adapters/equity-curve.chart-adapter.js';
import type { ArenaTelemetry } from '../types.js';

export function EquityCurvePanel({ telemetry }: { telemetry: ArenaTelemetry | null }) {
  const data = toEquitySeries(telemetry?.equity ?? []);
  return (
    <section data-testid="equity-curve-panel" className="panel">
      <h2>Agent equity</h2>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="timestamp" hide />
          <YAxis yAxisId="equity" tickFormatter={(v) => formatMoney(v)} />
          <YAxis yAxisId="pnl" orientation="right" hide />
          <Tooltip formatter={(value) => formatMoney(String(value))} />
          <Area yAxisId="equity" dataKey="equity" fill="#7c3aed55" stroke="#a78bfa" />
          <Bar yAxisId="pnl" dataKey="realizedPnl" fill="#38bdf8" />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
