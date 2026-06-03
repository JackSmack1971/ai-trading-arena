import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import {
  AgentDecisionSchema,
  PaperFillSchema,
  DecimalStringSchema,
  NonNegativeDecimalStringSchema,
  RiskEventSchema,
  SimEventTypeSchema,
  MoneyDecimal,
  ZERO_MONEY,
  roundForDisplay,
  roundForSettlement,
  DefaultRiskConfig,
  RiskConfigSchema,
  StrategyManifestSchema,
  describeEventType,
  REAL_TRADING_ENABLED,
} from '../index.js';

describe('DecimalStringSchema', () => {
  it('accepts valid decimal strings', () => {
    expect(DecimalStringSchema.safeParse('100').success).toBe(true);
    expect(DecimalStringSchema.safeParse('0.50').success).toBe(true);
    expect(DecimalStringSchema.safeParse('-42.30').success).toBe(true);
    expect(DecimalStringSchema.safeParse('0').success).toBe(true);
    expect(DecimalStringSchema.safeParse('1234567890.123456789').success).toBe(true);
  });

  it('rejects scientific notation and invalid strings', () => {
    expect(DecimalStringSchema.safeParse('1e-5').success).toBe(false);
    expect(DecimalStringSchema.safeParse('not-a-number').success).toBe(false);
    expect(DecimalStringSchema.safeParse('').success).toBe(false);
    expect(DecimalStringSchema.safeParse('1.2.3').success).toBe(false);
  });

  it('rejects negative values for NonNegativeDecimalString', () => {
    expect(NonNegativeDecimalStringSchema.safeParse('-1').success).toBe(false);
    expect(NonNegativeDecimalStringSchema.safeParse('0').success).toBe(true);
    expect(NonNegativeDecimalStringSchema.safeParse('100.50').success).toBe(true);
  });
});

describe('MoneyDecimal', () => {
  it('avoids floating-point rounding errors (0.7 + 0.1 === 0.8)', () => {
    const result = new MoneyDecimal('0.7').plus(new MoneyDecimal('0.1'));
    expect(result.toFixed(1)).toBe('0.8');
  });

  it('ZERO_MONEY equals 0', () => {
    expect(ZERO_MONEY.toFixed(2)).toBe('0.00');
  });

  it('rounds for display at 2 decimal places', () => {
    const val = new MoneyDecimal('1.005');
    expect(roundForDisplay(val, 2)).toBe('1.01');
  });

  it('rounds for settlement at 2 decimal places', () => {
    const val = new MoneyDecimal('99.999');
    expect(roundForSettlement(val, 2)).toBe('100.00');
  });

  it('handles negative P&L correctly', () => {
    const pnl = new MoneyDecimal('-42.57');
    expect(pnl.isNegative()).toBe(true);
    expect(pnl.toFixed(2)).toBe('-42.57');
  });
});

describe('AgentDecisionSchema', () => {
  const validNoop: z.input<typeof AgentDecisionSchema> = {
    action: 'NOOP',
    confidence: 0.5,
    thesis: {
      summary: 'No action needed — market is ranging.',
      evidence: ['RSI is neutral at 50', 'Volume below average'],
      invalidation: 'If price breaks above resistance',
      expectedHoldingPeriod: 'N/A',
    },
    risk: {
      maxLossUsd: '0',
    },
  };

  const validBuy: z.input<typeof AgentDecisionSchema> = {
    action: 'PLACE_LIMIT_ORDER',
    symbol: 'BTC-USD',
    side: 'BUY',
    quantityUsd: '500.00',
    limitPrice: '43250.00',
    confidence: 0.72,
    thesis: {
      summary: 'BTC momentum positive after 9/21 EMA cross.',
      evidence: ['EMA 9 crossed above EMA 21', '1m volume above 20-bar average'],
      invalidation: 'Close below EMA 21 or drawdown above $35',
      expectedHoldingPeriod: '15-60 minutes',
    },
    risk: {
      maxLossUsd: '35.00',
      stopPrice: '43000.00',
      takeProfitPrice: '44000.00',
    },
  };

  it('validates a NOOP decision', () => {
    const result = AgentDecisionSchema.safeParse(validNoop);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('NOOP');
      expect(result.data.confidence).toBe(0.5);
    }
  });

  it('validates a PLACE_LIMIT_ORDER decision', () => {
    const result = AgentDecisionSchema.safeParse(validBuy);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('PLACE_LIMIT_ORDER');
      expect(result.data.symbol).toBe('BTC-USD');
      expect(result.data.side).toBe('BUY');
      expect(result.data.quantityUsd).toBe('500.00');
    }
  });

  it('rejects decision missing confidence', () => {
    const invalid = { ...validNoop } as Record<string, unknown>;
    delete invalid['confidence'];
    expect(AgentDecisionSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects confidence outside [0,1]', () => {
    expect(AgentDecisionSchema.safeParse({ ...validNoop, confidence: 1.5 }).success).toBe(false);
    expect(AgentDecisionSchema.safeParse({ ...validNoop, confidence: -0.1 }).success).toBe(false);
  });

  it('rejects invalid action name', () => {
    expect(AgentDecisionSchema.safeParse({ ...validNoop, action: 'PLACE_REAL_ORDER' }).success).toBe(false);
  });

  it('rejects negative quantityUsd', () => {
    const invalid = { ...validBuy, quantityUsd: '-100.00' };
    expect(AgentDecisionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('PaperFillSchema', () => {
  const validFill: z.input<typeof PaperFillSchema> = {
    fillId: 'fill_01',
    orderId: 'order_01',
    agentId: 'agent_a',
    symbol: 'BTC-USD',
    side: 'BUY',
    quantity: '0.01152830',
    price: '43250.00',
    fee: '0.50',
    slippageBps: '2',
    liquiditySource: 'coinbase-book',
    timestamp: '2024-01-01T12:00:00.000Z',
  };

  it('validates a valid fill', () => {
    const result = PaperFillSchema.safeParse(validFill);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fillId).toBe('fill_01');
      expect(result.data.side).toBe('BUY');
      expect(result.data.price).toBe('43250.00');
    }
  });

  it('rejects fill with missing required fields', () => {
    const invalid = { ...validFill } as Record<string, unknown>;
    delete invalid['fillId'];
    expect(PaperFillSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects fill with negative price', () => {
    expect(PaperFillSchema.safeParse({ ...validFill, price: '-100.00' }).success).toBe(false);
  });

  it('rejects fill with invalid side', () => {
    expect(PaperFillSchema.safeParse({ ...validFill, side: 'HOLD' }).success).toBe(false);
  });

  it('rejects fill with invalid timestamp', () => {
    expect(PaperFillSchema.safeParse({ ...validFill, timestamp: '2024-01-01' }).success).toBe(false);
  });
});

describe('RiskEventSchema', () => {
  const validRejection: z.input<typeof RiskEventSchema> = {
    eventId: 'risk_01',
    runId: 'run_01',
    agentId: 'agent_b',
    ruleId: 'MAX_POSITION_SIZE',
    decision: 'REJECTED',
    requestedAction: 'PLACE_MARKET_ORDER',
    requestedValueUsd: '2500',
    allowedValueUsd: '1000',
    threshold: '10',
    reason: 'quantityUsd exceeds max_position_pct',
    timestamp: '2024-01-01T12:00:00.000Z',
  };

  it('validates a risk rejection event', () => {
    const result = RiskEventSchema.safeParse(validRejection);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decision).toBe('REJECTED');
      expect(result.data.ruleId).toBe('MAX_POSITION_SIZE');
    }
  });

  it('rejects unknown rule ID', () => {
    expect(RiskEventSchema.safeParse({ ...validRejection, ruleId: 'UNKNOWN_RULE' }).success).toBe(false);
  });


  it('validates a risk approval event without a breached rule ID', () => {
    const result = RiskEventSchema.safeParse({
      eventId: 'risk_pass_01',
      runId: 'run_01',
      agentId: 'agent_b',
      decision: 'PASSED',
      requestedAction: 'MARKET_BUY_ORDER',
      requestedValueUsd: '100',
      reason: 'Risk gate approved the paper simulator action.',
      timestamp: '2024-01-01T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decision).toBe('PASSED');
      expect(result.data.ruleId).toBeUndefined();
    }
  });
});

describe('SimEventTypeSchema', () => {
  it('validates all 21 event types', () => {
    const types = SimEventTypeSchema.options;
    expect(types).toHaveLength(21);
    expect(types).toContain('MARKET_TICK_RECEIVED');
    expect(types).toContain('PAPER_ORDER_FILLED');
    expect(types).toContain('STRATEGY_SWITCH_REQUESTED');
    expect(types).toContain('AGENT_DECISION_INVALID');
    expect(types).toContain('STRATEGY_SWITCH_REQUESTED');
  });
});

describe('StrategyManifestSchema', () => {
  it('validates a valid strategy manifest', () => {
    const manifest = {
      id: 'momentum-basic',
      name: 'Momentum Basic',
      version: '0.1.0',
      entry: 'strategy.ts',
      permissions: {
        network: false,
        filesystem: false,
        can_emit_orders: false,
        can_emit_signals: true,
      },
    };
    const result = StrategyManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects manifest with network: true', () => {
    const manifest = {
      id: 'bad-strategy',
      name: 'Bad Strategy',
      version: '0.1.0',
      entry: 'strategy.ts',
      permissions: {
        network: true,
        filesystem: false,
        can_emit_orders: false,
        can_emit_signals: true,
      },
    };
    expect(StrategyManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it('rejects manifest with can_emit_orders: true', () => {
    const manifest = {
      id: 'bad-strategy',
      name: 'Bad Strategy',
      version: '0.1.0',
      entry: 'strategy.ts',
      permissions: {
        network: false,
        filesystem: false,
        can_emit_orders: true,
        can_emit_signals: true,
      },
    };
    expect(StrategyManifestSchema.safeParse(manifest).success).toBe(false);
  });
});

describe('DefaultRiskConfig', () => {
  it('satisfies RiskConfigSchema and hardcodes all safety flags to false', () => {
    const result = RiskConfigSchema.safeParse(DefaultRiskConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowRealExecution).toBe(false);
      expect(result.data.allowLeverage).toBe(false);
      expect(result.data.allowNegativeCash).toBe(false);
    }
  });
});

describe('describeEventType', () => {
  it('describes every event type without throwing', () => {
    const types = SimEventTypeSchema.options;
    for (const type of types) {
      expect(() => describeEventType(type)).not.toThrow();
      expect(typeof describeEventType(type)).toBe('string');
    }
  });
});

describe('REAL_TRADING_ENABLED', () => {
  it('is always false', () => {
    expect(REAL_TRADING_ENABLED).toBe(false);
  });
});
