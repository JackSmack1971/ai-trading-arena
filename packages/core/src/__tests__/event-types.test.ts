import { describe, it, expect } from 'vitest';
import {
  SimEventTypeSchema,
  SimEventPayloadSchemas,
  StrategySwitchRequestedPayloadSchema,
} from '../index.js';

describe('SimEventPayloadSchemas', () => {
  it('has an entry for every SimEventType', () => {
    const typeOptions = SimEventTypeSchema.options;
    const schemaKeys = Object.keys(SimEventPayloadSchemas);

    expect(schemaKeys.length).toBe(typeOptions.length);

    for (const eventType of typeOptions) {
      expect(
        schemaKeys,
        `SimEventPayloadSchemas is missing key: ${eventType}`,
      ).toContain(eventType);
    }
  });

  it('MARKET_TICK_RECEIVED schema parses a valid tick', () => {
    const result = SimEventPayloadSchemas['MARKET_TICK_RECEIVED'].safeParse({
      eventId: 'e1',
      sourceId: 's',
      symbol: 'BTC-USD',
      eventType: 'MARKET_TICK_RECEIVED',
      exchangeTimestamp: '2026-01-01T00:00:00.000Z',
      receivedAt: '2026-01-01T00:00:00.000Z',
      latencyMs: 0,
    });
    expect(result.success).toBe(true);
  });

  it('STRATEGY_SWITCH_REQUESTED schema parses a valid payload', () => {
    const result = StrategySwitchRequestedPayloadSchema.safeParse({
      runId: 'run-1',
      agentId: 'agent-1',
      fromStrategyId: 'strat-a',
      toStrategyId: 'strat-b',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('STRATEGY_SWITCH_REQUESTED schema rejects missing fields', () => {
    const result = StrategySwitchRequestedPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
