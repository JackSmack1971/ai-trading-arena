import { describe, expect, it } from 'vitest';
import { PaperRiskGate } from '../risk-gate.js';
import type { RiskGateContext } from '../risk-gate.js';
import type { RiskConfig } from '@arena/core';

const T1 = '2024-01-01T00:00:00.000Z';

/**
 * Lenient base config — all limits set high so only the target rule can fire
 * in each boundary-value test.
 */
const LENIENT_RISK_CONFIG: RiskConfig = {
  maxPositionPct: '100',
  maxSymbolExposurePct: '100',
  maxTotalExposurePct: '100',
  maxDrawdownPct: '100',
  maxOrdersPerMinute: 100,
  maxStrategySwitchesPerHour: 100,
  allowNegativeCash: false,
  allowLeverage: false,
  allowRealExecution: false,
};

/**
 * Builds a baseline RiskGateContext where no risk rule fires under LENIENT_RISK_CONFIG.
 * Tests override only the fields relevant to the rule under test.
 */
function makeCtx(overrides: Partial<RiskGateContext> = {}): RiskGateContext {
  return {
    runId: 'run-gate',
    agentId: 'agent-a',
    timestamp: T1,
    request: {
      symbol: 'BTC-USD',
      side: 'BUY',
      quantityUsd: '100.00',
      orderType: 'MARKET',
    },
    portfolio: {
      agentId: 'agent-a',
      cashBalance: '10000.00',
      equity: '10000.00',
      totalPositionValue: '0',
      unrealizedPnl: '0',
      realizedPnl: '0',
      exposurePct: '0',
      currentDrawdownPct: '0',
      snapshotAt: T1,
    },
    availableCash: '10000.00',
    positions: [],
    ordersThisMinute: 0,
    strategySwitchesThisHour: 0,
    ...overrides,
  };
}

// ── MAX_DRAWDOWN boundary-value tests ──────────────────────────────────────────────────────────

describe('MAX_DRAWDOWN boundary-value tests', () => {
  const gate = new PaperRiskGate({ ...LENIENT_RISK_CONFIG, maxDrawdownPct: '10' });

  it('PASSED when currentDrawdownPct is just below the threshold (9.99)', () => {
    const ctx = makeCtx({
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '10000.00',
        equity: '10000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '9.99',
        snapshotAt: T1,
      },
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('PASSED');
  });

  it('REJECTED when currentDrawdownPct exceeds threshold (10.01), fires MAX_DRAWDOWN', () => {
    const ctx = makeCtx({
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '10000.00',
        equity: '10000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '10.01',
        snapshotAt: T1,
      },
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('REJECTED');
    expect(result.event.ruleId).toBe('MAX_DRAWDOWN');
  });
});

// ── NO_NEGATIVE_CASH boundary-value tests ─────────────────────────────────────────────────────

describe('NO_NEGATIVE_CASH boundary-value tests', () => {
  const gate = new PaperRiskGate({ ...LENIENT_RISK_CONFIG, allowNegativeCash: false });

  it('PASSED when quantityUsd equals availableCash exactly (lt, not lte)', () => {
    // equity=2000, totalPositionValue=1000 → positionPct = 1000/2000*100 = 50% ≤ 100% maxPositionPct
    // availableCash=1000, quantityUsd=1000 → availableCash.lt(requestedNotional) is false → PASSED
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '1000.00',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '2000.00',
        totalPositionValue: '1000.00',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '50',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('PASSED');
  });

  it('REJECTED when quantityUsd exceeds availableCash by one cent (1000.01 vs 1000.00), fires NO_NEGATIVE_CASH', () => {
    // availableCash=1000.00, quantityUsd=1000.01 → availableCash.lt(requestedNotional) → REJECTED
    // MAX_POSITION_SIZE (rule 7) fires AFTER NO_NEGATIVE_CASH (rule 6):
    //   requestedPositionPct = 1000.01/2000*100 = 50.005% ≤ 100% maxPositionPct → would PASS anyway
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '1000.01',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '2000.00',
        totalPositionValue: '1000.00',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '50',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('REJECTED');
    expect(result.event.ruleId).toBe('NO_NEGATIVE_CASH');
  });
});

// ── MAX_SYMBOL_EXPOSURE boundary-value tests ──────────────────────────────────────────────────

describe('MAX_SYMBOL_EXPOSURE boundary-value tests', () => {
  const gate = new PaperRiskGate({ ...LENIENT_RISK_CONFIG, maxSymbolExposurePct: '50' });

  it('PASSED when projected symbol exposure is exactly at threshold (50.00%)', () => {
    // No existing BTC-USD position, equity=1000, quantityUsd=500
    // projectedSymbolExposure = 0 + 500 = 500
    // projectedSymbolExposurePct = 500/1000*100 = 50.0% → gt('50') is false → PASSED
    // MAX_POSITION_SIZE: maxPositionPct=100 → 500/1000*100 = 50% ≤ 100% → PASS
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '500.00',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '1000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('PASSED');
  });

  it('REJECTED when projected symbol exposure exceeds threshold by one cent (500.01/1000 > 50%), fires MAX_SYMBOL_EXPOSURE', () => {
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '500.01',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '1000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('REJECTED');
    expect(result.event.ruleId).toBe('MAX_SYMBOL_EXPOSURE');
  });
});

// ── MAX_TOTAL_EXPOSURE boundary-value tests ───────────────────────────────────────────────────

describe('MAX_TOTAL_EXPOSURE boundary-value tests', () => {
  const gate = new PaperRiskGate({ ...LENIENT_RISK_CONFIG, maxTotalExposurePct: '50' });

  it('PASSED when projected total exposure is exactly at threshold (50.00%)', () => {
    // No existing positions, totalPositionValue=0, equity=1000, quantityUsd=500
    // projectedTotalExposure = 0 + 500 = 500
    // projectedTotalExposurePct = 500/1000*100 = 50.0% → gt('50') is false → PASSED
    // MAX_SYMBOL_EXPOSURE: maxSymbolExposurePct=100 → 500/1000*100 = 50% ≤ 100% → PASS
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '500.00',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '1000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('PASSED');
  });

  it('REJECTED when projected total exposure exceeds threshold by one cent (500.01/1000 > 50%), fires MAX_TOTAL_EXPOSURE', () => {
    const ctx = makeCtx({
      request: {
        symbol: 'BTC-USD',
        side: 'BUY',
        quantityUsd: '500.01',
        orderType: 'MARKET',
      },
      portfolio: {
        agentId: 'agent-a',
        cashBalance: '1000.00',
        equity: '1000.00',
        totalPositionValue: '0',
        unrealizedPnl: '0',
        realizedPnl: '0',
        exposurePct: '0',
        currentDrawdownPct: '0',
        snapshotAt: T1,
      },
      availableCash: '1000.00',
    });
    const result = gate.evaluateOrder(ctx);
    expect(result.decision).toBe('REJECTED');
    expect(result.event.ruleId).toBe('MAX_TOTAL_EXPOSURE');
  });
});
