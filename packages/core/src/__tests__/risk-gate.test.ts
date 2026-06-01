import { describe, it, expect } from 'vitest';
import { evaluateRiskGate } from '../risk-gate.js';
import { DefaultRiskConfig } from '../schemas/risk.js';
import type { RiskConfig, RiskState } from '../schemas/risk.js';
import type { RiskActionDescriptor } from '../risk-gate.js';

function makeState(overrides: Partial<RiskState> = {}): RiskState {
  return {
    runId: 'run-test',
    agentId: 'agent-test',
    currentDrawdownPct: '0',
    maxDrawdownPct: '5',
    positionValueUsd: '0',
    totalExposurePct: '0',
    ordersThisMinute: 0,
    strategySwitchesThisHour: 0,
    lastEvaluatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeBuyAction(overrides: Partial<RiskActionDescriptor> = {}): RiskActionDescriptor {
  return {
    action: 'PLACE_MARKET_ORDER',
    side: 'BUY',
    symbol: 'BTC-USD',
    requestedValueUsd: '1000',
    cashBalanceUsd: '10000',
    equityUsd: '10000',
    symbolExposureUsd: '0',
    ...overrides,
  };
}

describe('evaluateRiskGate', () => {
  it('passes a well-within-limits BUY order', () => {
    const result = evaluateRiskGate(DefaultRiskConfig, makeState(), makeBuyAction());
    expect(result.passed).toBe(true);
  });

  it('passes a SELL order regardless of exposure checks', () => {
    const result = evaluateRiskGate(
      DefaultRiskConfig,
      makeState(),
      makeBuyAction({ side: 'SELL', requestedValueUsd: '5000', cashBalanceUsd: '100' }),
    );
    expect(result.passed).toBe(true);
  });

  describe('INSUFFICIENT_BALANCE', () => {
    it('rejects BUY when cash < requestedValue', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState(),
        makeBuyAction({ requestedValueUsd: '5000', cashBalanceUsd: '4999' }),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('INSUFFICIENT_BALANCE');
    });

    it('passes BUY when cash exactly equals requestedValue', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState(),
        makeBuyAction({ requestedValueUsd: '5000', cashBalanceUsd: '5000', equityUsd: '5000' }),
      );
      // May fail MAX_POSITION_SIZE (50% > 10%) but not INSUFFICIENT_BALANCE
      if (!result.passed) expect(result.ruleId).not.toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('MAX_POSITION_SIZE', () => {
    it('rejects when single order exceeds maxPositionPct of equity', () => {
      // Default maxPositionPct = 10%. Order of 1100 on 10000 equity = 11%
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState(),
        makeBuyAction({ requestedValueUsd: '1100', cashBalanceUsd: '10000', equityUsd: '10000' }),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_POSITION_SIZE');
    });

    it('passes when order is exactly at the limit', () => {
      // 1000 / 10000 = 10% = maxPositionPct
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState(),
        makeBuyAction({ requestedValueUsd: '1000', cashBalanceUsd: '10000', equityUsd: '10000' }),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('MAX_SYMBOL_EXPOSURE', () => {
    it('rejects when existing + new exposure exceeds maxSymbolExposurePct', () => {
      // Default maxSymbolExposurePct = 20%. Existing 1500 + new 1000 = 2500 / 10000 = 25%
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState(),
        makeBuyAction({
          requestedValueUsd: '1000',
          cashBalanceUsd: '10000',
          equityUsd: '10000',
          symbolExposureUsd: '1500',
        }),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_SYMBOL_EXPOSURE');
    });
  });

  describe('MAX_TOTAL_EXPOSURE', () => {
    it('rejects when total position value + new order exceeds maxTotalExposurePct', () => {
      // Default maxTotalExposurePct = 80%. positionValueUsd 7500 + 1000 = 8500 / 10000 = 85%
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ positionValueUsd: '7500' }),
        makeBuyAction({
          requestedValueUsd: '1000',
          cashBalanceUsd: '2500',
          equityUsd: '10000',
          symbolExposureUsd: '0',
        }),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_TOTAL_EXPOSURE');
    });
  });

  describe('MAX_DRAWDOWN', () => {
    it('rejects when currentDrawdownPct exceeds maxDrawdownPct', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ currentDrawdownPct: '5.01' }),
        makeBuyAction(),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_DRAWDOWN');
    });

    it('passes when drawdown is exactly at the limit', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ currentDrawdownPct: '5' }),
        makeBuyAction(),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('MAX_ORDERS_PER_MINUTE', () => {
    it('rejects when ordersThisMinute >= maxOrdersPerMinute', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ ordersThisMinute: 10 }),
        makeBuyAction(),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_ORDERS_PER_MINUTE');
    });

    it('passes when ordersThisMinute is below limit', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ ordersThisMinute: 9 }),
        makeBuyAction(),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('MAX_STRATEGY_SWITCHES_PER_HOUR', () => {
    it('rejects when strategySwitchesThisHour >= limit', () => {
      const result = evaluateRiskGate(
        DefaultRiskConfig,
        makeState({ strategySwitchesThisHour: 4 }),
        makeBuyAction(),
      );
      expect(result.passed).toBe(false);
      if (!result.passed) expect(result.ruleId).toBe('MAX_STRATEGY_SWITCHES_PER_HOUR');
    });
  });

  it('result carries threshold and observedValue on rejection', () => {
    const result = evaluateRiskGate(
      DefaultRiskConfig,
      makeState({ currentDrawdownPct: '6' }),
      makeBuyAction(),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.threshold).toBe('5');
      expect(result.observedValue).toBe('6');
    }
  });

  it('custom config is respected', () => {
    const strict: RiskConfig = { ...DefaultRiskConfig, maxPositionPct: '5' };
    // 600 / 10000 = 6% > 5%
    const result = evaluateRiskGate(
      strict,
      makeState(),
      makeBuyAction({ requestedValueUsd: '600', cashBalanceUsd: '10000', equityUsd: '10000' }),
    );
    expect(result.passed).toBe(false);
    if (!result.passed) expect(result.ruleId).toBe('MAX_POSITION_SIZE');
  });
});
