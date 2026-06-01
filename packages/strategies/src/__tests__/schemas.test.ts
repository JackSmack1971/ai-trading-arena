import { describe, it, expect } from 'vitest';
import { StrategyManifestSchema, StrategySignalSchema } from '../schemas.js';

describe('StrategyManifestSchema (consolidated from @arena/core — issue #9)', () => {
  it('accepts a manifest with an inputs field', () => {
    const result = StrategyManifestSchema.safeParse({
      id: 'test-strategy',
      name: 'Test Strategy',
      version: '1.0.0',
      entry: 'index.ts',
      permissions: {
        network: false,
        filesystem: false,
        can_emit_orders: false,
        can_emit_signals: true,
      },
      inputs: { threshold: 0.05, lookback: 20 },
    });
    expect(result.success).toBe(true);
    expect(result.data?.inputs).toEqual({ threshold: 0.05, lookback: 20 });
  });

  it('accepts a manifest without an inputs field', () => {
    const result = StrategyManifestSchema.safeParse({
      id: 'bare-strategy',
      name: 'Bare Strategy',
      version: '1.0.0',
      entry: 'index.ts',
      permissions: {
        network: false,
        filesystem: false,
        can_emit_orders: false,
        can_emit_signals: true,
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.inputs).toBeUndefined();
  });

  it('rejects a manifest with invalid permissions (network:true)', () => {
    const result = StrategyManifestSchema.safeParse({
      id: 'bad-strategy',
      name: 'Bad Strategy',
      version: '1.0.0',
      entry: 'index.ts',
      permissions: {
        network: true,  // must be false
        filesystem: false,
        can_emit_orders: false,
        can_emit_signals: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a manifest with missing required fields', () => {
    const result = StrategyManifestSchema.safeParse({ id: 'incomplete' });
    expect(result.success).toBe(false);
  });
});

describe('StrategySignalSchema (from @arena/core — issue #9)', () => {
  it('accepts a valid signal', () => {
    const result = StrategySignalSchema.safeParse({
      signalId: 'sig-001',
      strategyId: 'test-strategy',
      strategyVersion: '1.0.0',
      inputEventId: 'evt-001',
      symbol: 'BTC-USD',
      signal: 'long',
      confidence: 0.8,
      featuresUsed: ['rsi', 'ema'],
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidence outside 0-1', () => {
    const result = StrategySignalSchema.safeParse({
      signalId: 'sig-002',
      strategyId: 'test-strategy',
      strategyVersion: '1.0.0',
      inputEventId: 'evt-002',
      symbol: 'BTC-USD',
      signal: 'long',
      confidence: 1.5,
      featuresUsed: [],
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
