import type { Time } from 'lightweight-charts';
import type { ArenaTelemetry } from '../types.js';

export interface PricePoint { time: Time; value: number }
export function toPriceSeries(ticks: ArenaTelemetry['marketTicks']): PricePoint[] {
  return [...ticks]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((tick) => ({ time: Math.floor(new Date(tick.timestamp).getTime() / 1000) as Time, value: Number(tick.price) }));
}
