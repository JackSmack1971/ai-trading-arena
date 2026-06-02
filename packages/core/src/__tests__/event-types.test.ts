import { describe, expect, it } from 'vitest';
import {
  MarketTickPayloadSchema,
  PaperOrderPayloadSchema,
  SimEventPayloadSchemas,
  SimEventTypeSchema,
  StrategySwitchRequestedPayloadSchema,
} from '../index.js';

describe('SimEventPayloadSchemas', () => {
  it('has one payload schema for every simulator event type', () => {
    expect(Object.keys(SimEventPayloadSchemas).sort()).toEqual([...SimEventTypeSchema.options].sort());
    expect(Object.keys(SimEventPayloadSchemas)).toHaveLength(21);
  });

  it('uses exact schema references for typed event payloads', () => {
    expect(SimEventPayloadSchemas.MARKET_TICK_RECEIVED).toBe(MarketTickPayloadSchema);
    expect(SimEventPayloadSchemas.STRATEGY_SWITCH_REQUESTED).toBe(StrategySwitchRequestedPayloadSchema);
  });

  it('validates strategy switch request payloads', () => {
    expect(
      StrategySwitchRequestedPayloadSchema.parse({
        runId: 'run-1',
        agentId: 'agent-a',
        fromStrategyId: 'momentum-basic',
        toStrategyId: 'mean-reversion-basic',
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toMatchObject({ toStrategyId: 'mean-reversion-basic' });
    expect(() => StrategySwitchRequestedPayloadSchema.parse({})).toThrow();
  });

  it('keeps broker append-event wrappers as generic payload records', () => {
    const wrapperPayload = {
      type: 'PAPER_ORDER_CREATED',
      order: {
        orderId: 'order-1',
        runId: 'run-1',
        agentId: 'agent-a',
        symbol: 'BTC-USD',
        side: 'BUY',
        orderType: 'MARKET',
        status: 'OPEN',
        quantityUsd: '100',
        filledQuantity: '0',
        averageFillPrice: '0',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    expect(SimEventPayloadSchemas.PAPER_ORDER_CREATED.parse(wrapperPayload)).toEqual(wrapperPayload);
    expect(PaperOrderPayloadSchema.safeParse(wrapperPayload).success).toBe(false);
  });
});
