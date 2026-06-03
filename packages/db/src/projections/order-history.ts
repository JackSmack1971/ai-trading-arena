import { OrderHistoryPageSchema, type OrderHistoryPage, type OrderRecord } from '@arena/core';
import type { ArenaDb } from '../client.js';
import { replayRun } from '../repositories/events.js';
import { parsePayload } from './helpers.js';

export function projectOrderHistory(db: ArenaDb, runId: string, opts: { limit?: number; offset?: number } = {}): OrderHistoryPage {
  const records = new Map<string, OrderRecord>();
  for (const row of replayRun(db, runId)) {
    const payload = parsePayload(row);
    const order = payload['order'] as Record<string, unknown> | undefined;
    if (row.type === 'PAPER_ORDER_CREATED' && order) {
      records.set(String(order['orderId']), {
        orderId: String(order['orderId']),
        agentId: String(order['agentId']),
        symbol: String(order['symbol']),
        side: order['side'] as OrderRecord['side'],
        type: order['orderType'] as OrderRecord['type'],
        quantity: String(order['quantityUsd']),
        limitPrice: order['limitPrice'] === undefined ? undefined : String(order['limitPrice']),
        status: order['status'] as OrderRecord['status'],
        placedAt: String(order['createdAt'] ?? row.timestamp),
      });
    }
    if (row.type === 'PAPER_ORDER_FILLED') {
      const fill = payload['fill'] as Record<string, unknown> | undefined;
      const filledOrder = order ?? undefined;
      const orderId = String(fill?.['orderId'] ?? filledOrder?.['orderId'] ?? '');
      const existing = records.get(orderId);
      if (existing && fill) {
        records.set(orderId, {
          ...existing,
          status: 'FILLED',
          fillPrice: String(fill['price']),
          fillQuantity: String(fill['quantity']),
          fee: String(fill['fee']),
          filledAt: String(fill['timestamp'] ?? row.timestamp),
        });
      }
    }
    if (row.type === 'PAPER_ORDER_CANCELLED' && order) {
      const orderId = String(order['orderId']);
      const existing = records.get(orderId);
      if (existing) records.set(orderId, { ...existing, status: 'CANCELLED', cancelledAt: String(order['updatedAt'] ?? row.timestamp) });
    }
  }
  const all = [...records.values()].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return OrderHistoryPageSchema.parse({ orders: all.slice(offset, offset + limit), total: all.length, offset, limit });
}
