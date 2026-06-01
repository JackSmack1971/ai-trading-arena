import { DefaultRiskConfig } from '@arena/core';
import { nanoid } from 'nanoid';
import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';
import type { PlaceOrderRequest, PortfolioSummary, Position } from './types.js';
import type { RiskConfig, RiskEvent, RiskRuleId } from '@arena/core';

export interface RiskGateContext {
  runId: string;
  agentId: string;
  timestamp: string;
  request: PlaceOrderRequest;
  portfolio: PortfolioSummary;
  availableCash: string;
  positions: Position[];
  ordersThisMinute: number;
  strategySwitchesThisHour: number;
}

export interface StrategySwitchRiskContext {
  runId: string;
  agentId: string;
  timestamp: string;
  strategyId: string;
  strategySwitchesThisHour: number;
}

export type RiskGateDecision =
  | { decision: 'PASSED' }
  | { decision: 'REJECTED'; event: RiskEvent };

function pctOfEquity(value: MoneyDecimal, equity: MoneyDecimal): MoneyDecimal {
  return equity.gt(ZERO_MONEY) ? value.div(equity).times('100') : ZERO_MONEY;
}

function createRiskEvent(params: {
  runId: string;
  agentId: string;
  ruleId: RiskRuleId;
  requestedAction: string;
  requestedValueUsd?: MoneyDecimal | undefined;
  allowedValueUsd?: MoneyDecimal | undefined;
  threshold?: MoneyDecimal | string | undefined;
  reason: string;
  timestamp: string;
}): RiskEvent {
  const event: RiskEvent = {
    eventId: nanoid(),
    runId: params.runId,
    agentId: params.agentId,
    ruleId: params.ruleId,
    decision: 'REJECTED',
    requestedAction: params.requestedAction,
    reason: params.reason,
    timestamp: params.timestamp,
  };
  if (params.requestedValueUsd !== undefined) event.requestedValueUsd = params.requestedValueUsd.toString();
  if (params.allowedValueUsd !== undefined) event.allowedValueUsd = params.allowedValueUsd.toString();
  if (params.threshold !== undefined) event.threshold = params.threshold.toString();
  return event;
}

export class PaperRiskGate {
  readonly config: RiskConfig;

  constructor(config: RiskConfig = DefaultRiskConfig) {
    this.config = config;
  }

  evaluateOrder(ctx: RiskGateContext): RiskGateDecision {
    const action = `${ctx.request.orderType}_${ctx.request.side}_ORDER`;
    const requestedNotional = new MoneyDecimal(ctx.request.quantityUsd);
    const availableCash = new MoneyDecimal(ctx.availableCash);
    const equity = new MoneyDecimal(ctx.portfolio.equity);
    const totalPositionValue = new MoneyDecimal(ctx.portfolio.totalPositionValue);
    const currentDrawdownPct = new MoneyDecimal(ctx.portfolio.currentDrawdownPct);

    if (ctx.request.executionMode === 'LIVE' || ctx.request.executionVenue === 'REAL') {
      return this.reject(ctx, 'NO_REAL_EXECUTION', action, requestedNotional, undefined, '0', 'Real execution requests are categorically disabled in the paper simulator.');
    }

    if (ctx.request.leverageMultiplier !== undefined && new MoneyDecimal(ctx.request.leverageMultiplier).gt('1')) {
      return this.reject(ctx, 'NO_LEVERAGE', action, requestedNotional, undefined, '1', 'Leveraged order requests are disabled in the MVP risk gate.');
    }

    if (currentDrawdownPct.gt(this.config.maxDrawdownPct)) {
      return this.reject(ctx, 'MAX_DRAWDOWN', action, currentDrawdownPct, new MoneyDecimal(this.config.maxDrawdownPct), this.config.maxDrawdownPct, 'Current drawdown exceeds the configured maximum drawdown.');
    }

    if (ctx.ordersThisMinute > this.config.maxOrdersPerMinute) {
      return this.reject(ctx, 'MAX_ORDERS_PER_MINUTE', action, new MoneyDecimal(ctx.ordersThisMinute), new MoneyDecimal(this.config.maxOrdersPerMinute), this.config.maxOrdersPerMinute.toString(), 'Order count for this run and agent exceeds the per-minute limit.');
    }

    if (ctx.strategySwitchesThisHour > this.config.maxStrategySwitchesPerHour) {
      return this.reject(ctx, 'MAX_STRATEGY_SWITCHES_PER_HOUR', action, new MoneyDecimal(ctx.strategySwitchesThisHour), new MoneyDecimal(this.config.maxStrategySwitchesPerHour), this.config.maxStrategySwitchesPerHour.toString(), 'Strategy switch count for this run and agent exceeds the hourly limit.');
    }

    if (ctx.request.side === 'BUY' && !this.config.allowNegativeCash && availableCash.lt(requestedNotional)) {
      return this.reject(ctx, 'NO_NEGATIVE_CASH', action, requestedNotional, availableCash, availableCash, 'Buy order would make paper cash negative.');
    }

    const requestedPositionPct = pctOfEquity(requestedNotional, equity);
    if (requestedPositionPct.gt(this.config.maxPositionPct)) {
      const allowed = equity.times(this.config.maxPositionPct).div('100');
      return this.reject(ctx, 'MAX_POSITION_SIZE', action, requestedNotional, allowed, this.config.maxPositionPct, 'Requested order notional exceeds the maximum position-size percentage.');
    }

    const currentSymbolExposure = ctx.positions
      .filter((position) => position.symbol === ctx.request.symbol)
      .reduce((sum, position) => sum.plus(new MoneyDecimal(position.quantity).times(position.currentPrice)), ZERO_MONEY);
    const projectedSymbolExposure = ctx.request.side === 'BUY'
      ? currentSymbolExposure.plus(requestedNotional)
      : MoneyDecimal.max(ZERO_MONEY, currentSymbolExposure.minus(requestedNotional));
    const projectedSymbolExposurePct = pctOfEquity(projectedSymbolExposure, equity);
    if (projectedSymbolExposurePct.gt(this.config.maxSymbolExposurePct)) {
      const allowed = equity.times(this.config.maxSymbolExposurePct).div('100');
      return this.reject(ctx, 'MAX_SYMBOL_EXPOSURE', action, projectedSymbolExposure, allowed, this.config.maxSymbolExposurePct, 'Projected symbol exposure exceeds the configured limit.');
    }

    const projectedTotalExposure = ctx.request.side === 'BUY'
      ? totalPositionValue.plus(requestedNotional)
      : MoneyDecimal.max(ZERO_MONEY, totalPositionValue.minus(requestedNotional));
    const projectedTotalExposurePct = pctOfEquity(projectedTotalExposure, equity);
    if (projectedTotalExposurePct.gt(this.config.maxTotalExposurePct)) {
      const allowed = equity.times(this.config.maxTotalExposurePct).div('100');
      return this.reject(ctx, 'MAX_TOTAL_EXPOSURE', action, projectedTotalExposure, allowed, this.config.maxTotalExposurePct, 'Projected total exposure exceeds the configured limit.');
    }

    return { decision: 'PASSED' };
  }

  evaluateStrategySwitch(ctx: StrategySwitchRiskContext): RiskGateDecision {
    if (ctx.strategySwitchesThisHour > this.config.maxStrategySwitchesPerHour) {
      return {
        decision: 'REJECTED',
        event: createRiskEvent({
          runId: ctx.runId,
          agentId: ctx.agentId,
          ruleId: 'MAX_STRATEGY_SWITCHES_PER_HOUR',
          requestedAction: `SWITCH_STRATEGY:${ctx.strategyId}`,
          requestedValueUsd: new MoneyDecimal(ctx.strategySwitchesThisHour),
          allowedValueUsd: new MoneyDecimal(this.config.maxStrategySwitchesPerHour),
          threshold: this.config.maxStrategySwitchesPerHour.toString(),
          reason: 'Strategy switch count for this run and agent exceeds the hourly limit.',
          timestamp: ctx.timestamp,
        }),
      };
    }
    return { decision: 'PASSED' };
  }

  private reject(
    ctx: RiskGateContext,
    ruleId: RiskRuleId,
    requestedAction: string,
    requestedValueUsd: MoneyDecimal,
    allowedValueUsd: MoneyDecimal | undefined,
    threshold: MoneyDecimal | string | undefined,
    reason: string,
  ): RiskGateDecision {
    return {
      decision: 'REJECTED',
      event: createRiskEvent({
        runId: ctx.runId,
        agentId: ctx.agentId,
        ruleId,
        requestedAction,
        requestedValueUsd,
        allowedValueUsd,
        threshold,
        reason,
        timestamp: ctx.timestamp,
      }),
    };
  }
}
