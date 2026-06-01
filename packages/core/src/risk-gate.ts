import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';
import type { RiskConfig, RiskRuleId, RiskState } from './schemas/risk.js';

export interface RiskActionDescriptor {
  action: 'PLACE_MARKET_ORDER' | 'PLACE_LIMIT_ORDER' | 'CANCEL_ORDER';
  side: 'BUY' | 'SELL';
  symbol: string;
  /** Notional USD value of the requested order */
  requestedValueUsd: string;
  /** Available cash balance before the order */
  cashBalanceUsd: string;
  /** Total account equity (cash + position market value) */
  equityUsd: string;
  /** Current market value of existing positions in this symbol */
  symbolExposureUsd: string;
}

export type RiskGateResult =
  | { passed: true }
  | { passed: false; ruleId: RiskRuleId; reason: string; threshold?: string; observedValue?: string };

/**
 * Pure, deterministic risk gate. Called before every paper-broker state
 * mutation. Returns { passed: true } or a typed rejection with rule ID.
 * Never throws — invalid Decimal inputs surface as INSUFFICIENT_BALANCE.
 */
export function evaluateRiskGate(
  config: RiskConfig,
  state: RiskState,
  action: RiskActionDescriptor,
): RiskGateResult {
  // MAX_DRAWDOWN: block all new orders when current drawdown exceeds limit
  const currentDrawdownPct = new MoneyDecimal(state.currentDrawdownPct);
  const maxDrawdownPct = new MoneyDecimal(config.maxDrawdownPct);
  if (currentDrawdownPct.gt(maxDrawdownPct)) {
    return {
      passed: false,
      ruleId: 'MAX_DRAWDOWN',
      reason: `Current drawdown ${state.currentDrawdownPct}% exceeds max ${config.maxDrawdownPct}%`,
      threshold: config.maxDrawdownPct,
      observedValue: state.currentDrawdownPct,
    };
  }

  // MAX_ORDERS_PER_MINUTE: count-based rate gate
  if (state.ordersThisMinute >= config.maxOrdersPerMinute) {
    return {
      passed: false,
      ruleId: 'MAX_ORDERS_PER_MINUTE',
      reason: `Orders this minute (${state.ordersThisMinute}) reached limit ${config.maxOrdersPerMinute}`,
      threshold: String(config.maxOrdersPerMinute),
      observedValue: String(state.ordersThisMinute),
    };
  }

  // MAX_STRATEGY_SWITCHES_PER_HOUR: count-based gate tracked externally
  if (state.strategySwitchesThisHour >= config.maxStrategySwitchesPerHour) {
    return {
      passed: false,
      ruleId: 'MAX_STRATEGY_SWITCHES_PER_HOUR',
      reason: `Strategy switches this hour (${state.strategySwitchesThisHour}) reached limit ${config.maxStrategySwitchesPerHour}`,
      threshold: String(config.maxStrategySwitchesPerHour),
      observedValue: String(state.strategySwitchesThisHour),
    };
  }

  // BUY-side checks only — SELL orders don't consume new cash or exposure
  if (action.side === 'BUY') {
    const requestedValue = new MoneyDecimal(action.requestedValueUsd);
    const cash = new MoneyDecimal(action.cashBalanceUsd);
    const equity = new MoneyDecimal(action.equityUsd);

    // INSUFFICIENT_BALANCE: cash must cover the full notional
    if (cash.lt(requestedValue)) {
      return {
        passed: false,
        ruleId: 'INSUFFICIENT_BALANCE',
        reason: `Cash ${action.cashBalanceUsd} insufficient for order ${action.requestedValueUsd}`,
        threshold: action.requestedValueUsd,
        observedValue: action.cashBalanceUsd,
      };
    }

    // NO_NEGATIVE_CASH: after debit, cash must stay >= 0
    const remainingCash = cash.minus(requestedValue);
    if (remainingCash.lt(ZERO_MONEY)) {
      return {
        passed: false,
        ruleId: 'NO_NEGATIVE_CASH',
        reason: `Order would result in negative cash balance (${remainingCash.toFixed(2)})`,
        threshold: '0',
        observedValue: remainingCash.toFixed(2),
      };
    }

    if (equity.gt(ZERO_MONEY)) {
      // MAX_POSITION_SIZE: single order notional as % of equity
      const positionPct = requestedValue.div(equity).times('100');
      const maxPositionPct = new MoneyDecimal(config.maxPositionPct);
      if (positionPct.gt(maxPositionPct)) {
        return {
          passed: false,
          ruleId: 'MAX_POSITION_SIZE',
          reason: `Order size ${positionPct.toFixed(2)}% of equity exceeds max ${config.maxPositionPct}%`,
          threshold: config.maxPositionPct,
          observedValue: positionPct.toFixed(2),
        };
      }

      // MAX_SYMBOL_EXPOSURE: existing exposure + this order as % of equity
      const symbolExposure = new MoneyDecimal(action.symbolExposureUsd);
      const newSymbolExposurePct = symbolExposure.plus(requestedValue).div(equity).times('100');
      const maxSymbolExposurePct = new MoneyDecimal(config.maxSymbolExposurePct);
      if (newSymbolExposurePct.gt(maxSymbolExposurePct)) {
        return {
          passed: false,
          ruleId: 'MAX_SYMBOL_EXPOSURE',
          reason: `Symbol exposure ${newSymbolExposurePct.toFixed(2)}% exceeds max ${config.maxSymbolExposurePct}%`,
          threshold: config.maxSymbolExposurePct,
          observedValue: newSymbolExposurePct.toFixed(2),
        };
      }

      // MAX_TOTAL_EXPOSURE: all existing positions + this order as % of equity
      const totalPositionValue = new MoneyDecimal(state.positionValueUsd);
      const newTotalExposurePct = totalPositionValue.plus(requestedValue).div(equity).times('100');
      const maxTotalExposurePct = new MoneyDecimal(config.maxTotalExposurePct);
      if (newTotalExposurePct.gt(maxTotalExposurePct)) {
        return {
          passed: false,
          ruleId: 'MAX_TOTAL_EXPOSURE',
          reason: `Total exposure ${newTotalExposurePct.toFixed(2)}% exceeds max ${config.maxTotalExposurePct}%`,
          threshold: config.maxTotalExposurePct,
          observedValue: newTotalExposurePct.toFixed(2),
        };
      }
    }
  }

  return { passed: true };
}
