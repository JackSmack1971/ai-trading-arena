import { createChart, LineSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { toPriceSeries } from '../chart-adapters/price-chart.chart-adapter.js';
import type { ArenaTelemetry } from '../types.js';

export function PriceChartPanel({ telemetry }: { telemetry: ArenaTelemetry | null }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addSeries']> | null>(null);

  useEffect(() => {
    if (!nodeRef.current) return;
    const chart = createChart(nodeRef.current, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: '#cbd5e1' } });
    const series = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 2 });
    seriesRef.current = series;
    return () => { chart.remove(); seriesRef.current = null; };
  }, []);

  useEffect(() => {
    const data = toPriceSeries(telemetry?.marketTicks ?? []);
    seriesRef.current?.setData(data);
    const latest = data.at(-1);
    if (latest) seriesRef.current?.update(latest);
  }, [telemetry]);

  return <section data-testid="price-chart-panel" className="panel"><h2>Market price</h2><div ref={nodeRef} className="chart-box" /></section>;
}
