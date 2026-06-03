import { MoneyDecimal } from '@arena/core';
import type { EventRow } from '../schema.js';

export function parsePayload(row: EventRow): Record<string, unknown> {
  return JSON.parse(row.payloadJson) as Record<string, unknown>;
}

export function money(value: string | number | undefined | null = '0'): string {
  return new MoneyDecimal(String(value)).toFixed(8);
}
