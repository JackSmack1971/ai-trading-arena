import type { ArenaTelemetry } from '../types.js';
export function toEquitySeries(points: ArenaTelemetry['equity']) {
  return points.map((point) => ({ timestamp: point.timestamp, equity: Number(point.equity), realizedPnl: 0 }));
}
export function formatMoney(value: number | string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}
