import { nanoid } from 'nanoid';
import { MoneyDecimal, ZERO_MONEY } from './money/decimal.js';
import { DEFAULT_FEE_CONFIG, TakerMakerFeeModel } from './fee-model.js';
import { SpreadSlippageModel } from './slippage-model.js';
import { CashLedger } from './ledger.js';
import { computeLimitFill, computeMarketFill } from './fills.js';
import { PositionTracker } from './positions.js';
import { PnLTracker } from './pnl.js';
import { PaperRiskGate } from './risk-gate.js';
import type { FeeModel } from './fee-model.js';
import type { RiskConfig, RiskEvent } from '@arena/core';
import type { SlippageModel } from './slippage-model.js';
import type {
  BrokerEventHandler,
  BrokerEventPayload,
  MarketTick,
  PaperFill,
  PaperOrder,
  PlaceOrderRequest,
  PnLSnapshot,
  PortfolioSummary,
  Position,
} from './types.js';

export interface BrokerConfig {
  runId: string;
  agentId: string;
  startingBalance: string;
  feeModel?: FeeModel;
  slippageModel?: SlippageModel;
  onEvent?: BrokerEventHandler;
  riskConfig?: RiskConfig;
}

export class PaperBroker {
  private readonly runId: string;
  private readonly agentId: string;
  private readonly startingBalance: string;
  private readonly ledger: CashLedger;
  private readonly posTracker: PositionTracker;
  private readonly pnlTracker: PnLTracker;
  private readonly feeModel: FeeModel;
  private readonly slippageModel: SlippageModel;
  private readonly onEvent: BrokerEventHandler | undefined;
  private readonly riskGate: PaperRiskGate;

  private readonly orders: Map<string, PaperOrder> = new Map();
  private readonly openOrders: Map<string, PaperOrder> = new Map();

  private totalFeesPaid: MoneyDecimal = ZERO_MONEY;
  private totalSlippagePaid: MoneyDecimal = ZERO_MONEY;
  private tradeCount = 0;
  private orderAttemptTimestamps: string[] = [];
  private strategySwitchTimestamps: string[] = [];

  constructor(config: BrokerConfig) {
    this.runId = config.runId;
    this.agentId = config.agentId;
    this.startingBalance = config.startingBalance;
    this.feeModel = config.feeModel ?? new TakerMakerFeeModel(DEFAULT_FEE_CONFIG);
    this.slippageModel = config.slippageModel ?? new SpreadSlippageModel();
    this.onEvent = config.onEvent;
    this.riskGate = new PaperRiskGate(config.riskConfig);
    this.ledger = new CashLedger(config.startingBalance);
    this.posTracker = new PositionTracker(config.runId, config.agentId);
    this.pnlTracker = new PnLTracker(config.startingBalance);
    this.ledger.recordDeposit(config.startingBalance, new Date().toISOString());
  }

  placeMarketOrder(req: PlaceOrderRequest): PaperOrder {
    const now = new Date().toISOString();
    const riskRejection = this.evaluateOrderRisk(req, now);
    if (riskRejection) {
      return this.rejectOrder(req, now, riskRejection.reason, riskRejection.event);
    }

    // Check available balance covers estimated cost (notional + max taker fee).
    const notional = new MoneyDecimal(req.quantityUsd);
    const estFee = notional.times('15').div('10000');
    const estCost = notional.plus(estFee);

    if (req.side === 'BUY' && this.ledger.getAvailable().lt(estCost)) {
      const order = this.makeOrder(req, 'REJECTED', now);
      this.orders.set(order.orderId, order);
      this.emit({ type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason: 'INSUFFICIENT_BALANCE' });
      return order;
    }

    if (req.side === 'SELL') {
      const pos = this.posTracker.getPosition(req.symbol);
      if (!pos) {
        const order = this.makeOrder(req, 'REJECTED', now);
        this.orders.set(order.orderId, order);
        this.emit({ type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason: 'NO_POSITION' });
        return order;
      }
    }

    const order = this.makeOrder(req, 'OPEN', now);
    this.orders.set(order.orderId, order);
    this.openOrders.set(order.orderId, order);
    this.emit({ type: 'PAPER_ORDER_CREATED', order });
    return order;
  }

  placeLimitOrder(req: PlaceOrderRequest): PaperOrder {
    const now = new Date().toISOString();
    if (!req.limitPrice) {
      const order = this.makeOrder({ ...req, orderType: 'LIMIT' }, 'REJECTED', now);
      this.orders.set(order.orderId, order);
      this.emit({ type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason: 'MISSING_LIMIT_PRICE' });
      return order;
    }

    const riskRejection = this.evaluateOrderRisk({ ...req, orderType: 'LIMIT' }, now);
    if (riskRejection) {
      return this.rejectOrder({ ...req, orderType: 'LIMIT' }, now, riskRejection.reason, riskRejection.event);
    }

    // For LIMIT BUY: reserve enough cash to cover notional + max maker fee.
    if (req.side === 'BUY') {
      const notional = new MoneyDecimal(req.quantityUsd);
      const maxFee = notional.times('15').div('10000');
      const reserveAmt = notional.plus(maxFee).toString();
      const ok = this.ledger.reserve(reserveAmt, req.orderId ?? 'pending', now);
      if (!ok) {
        const order = this.makeOrder({ ...req, orderType: 'LIMIT' }, 'REJECTED', now);
        this.orders.set(order.orderId, order);
        this.emit({ type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason: 'INSUFFICIENT_BALANCE' });
        return order;
      }
    }

    const order = this.makeOrder({ ...req, orderType: 'LIMIT' }, 'OPEN', now);
    // Fix: release and re-reserve with the actual orderId
    if (req.side === 'BUY') {
      this.ledger.releaseReserve(
        new MoneyDecimal(req.quantityUsd).times('15').div('10000').plus(req.quantityUsd).toString(),
        req.orderId ?? 'pending',
        now,
      );
      const notional = new MoneyDecimal(req.quantityUsd);
      const maxFee = notional.times('15').div('10000');
      this.ledger.reserve(notional.plus(maxFee).toString(), order.orderId, now);
    }

    this.orders.set(order.orderId, order);
    this.openOrders.set(order.orderId, order);
    this.emit({ type: 'PAPER_ORDER_CREATED', order });
    return order;
  }

  cancelOrder(orderId: string, timestamp: string): PaperOrder | undefined {
    const order = this.openOrders.get(orderId);
    if (!order) return undefined;

    if (order.side === 'BUY' && order.orderType === 'LIMIT') {
      const notional = new MoneyDecimal(order.quantityUsd);
      const maxFee = notional.times('15').div('10000');
      this.ledger.releaseReserve(notional.plus(maxFee).toString(), orderId, timestamp);
    }

    const cancelled: PaperOrder = { ...order, status: 'CANCELLED', updatedAt: timestamp };
    this.orders.set(orderId, cancelled);
    this.openOrders.delete(orderId);
    this.emit({ type: 'PAPER_ORDER_CANCELLED', order: cancelled });
    return cancelled;
  }

  processMarketTick(tick: MarketTick): PaperFill[] {
    const fills: PaperFill[] = [];
    const toRemove: string[] = [];

    for (const [orderId, order] of this.openOrders) {
      if (order.symbol !== tick.symbol) continue;

      let calc: ReturnType<typeof computeMarketFill> | null = null;

      if (order.orderType === 'MARKET') {
        calc = computeMarketFill({ order, tick, feeModel: this.feeModel, slippageModel: this.slippageModel });
      } else if (order.orderType === 'LIMIT') {
        calc = computeLimitFill({ order, tick, feeModel: this.feeModel });
      }

      if (!calc) continue;

      // Check position sufficiency for SELL fills.
      if (order.side === 'SELL') {
        const pos = this.posTracker.getPosition(order.symbol);
        if (!pos) { toRemove.push(orderId); continue; }
        const posQty = new MoneyDecimal(pos.quantity);
        const fillQty = new MoneyDecimal(calc.quantityBase);
        if (fillQty.gt(posQty)) {
          // Re-compute fill for the available quantity only.
          const availableNotional = posQty.times(calc.fillPrice);
          const scaledFee = new MoneyDecimal(calc.fee)
            .times(availableNotional).div(order.quantityUsd);
          calc = {
            ...calc,
            quantityBase: posQty.toString(),
            fee: scaledFee.toString(),
          };
        }
      }

      const fee = new MoneyDecimal(calc.fee);
      const notional = new MoneyDecimal(order.quantityUsd);
      const fillQty = new MoneyDecimal(calc.quantityBase);
      const fillPrice = new MoneyDecimal(calc.fillPrice);
      const slippageBps = new MoneyDecimal(calc.slippageBps);

      // Compute slippage cost in USD for tracking.
      const slippageCostUsd = notional.times(slippageBps).div('10000');

      // Ledger entries.
      if (order.side === 'BUY') {
        if (order.orderType === 'LIMIT') {
          // Release reserve first, then apply actual debit.
          const reserved = notional.times('15').div('10000').plus(notional);
          this.ledger.releaseReserve(reserved.toString(), orderId, tick.timestamp);
        }
        this.ledger.recordBuyDebit(notional.toString(), orderId, tick.timestamp);
        this.ledger.recordFeeDebit(fee.toString(), orderId, tick.timestamp);
      } else {
        this.ledger.recordSellCredit(notional.toString(), orderId, tick.timestamp);
        this.ledger.recordFeeDebit(fee.toString(), orderId, tick.timestamp);
      }

      this.totalFeesPaid = this.totalFeesPaid.plus(fee);
      this.totalSlippagePaid = this.totalSlippagePaid.plus(slippageCostUsd);
      this.tradeCount += 1;

      const fillId = nanoid();
      const fill: PaperFill = {
        fillId,
        orderId,
        agentId: this.agentId,
        symbol: order.symbol,
        side: order.side,
        quantity: fillQty.toString(),
        price: fillPrice.toString(),
        fee: fee.toString(),
        slippageBps: slippageBps.toString(),
        liquiditySource: calc.liquiditySource,
        timestamp: tick.timestamp,
      };

      // Update position.
      const position = this.posTracker.applyFill(fill, tick.timestamp);

      // Update order status.
      const filled: PaperOrder = {
        ...order,
        status: 'FILLED',
        filledQuantityUsd: order.quantityUsd,
        averageFillPrice: fillPrice.toString(),
        updatedAt: tick.timestamp,
      };
      this.orders.set(orderId, filled);
      toRemove.push(orderId);

      this.emit({ type: 'PAPER_ORDER_FILLED', fill, order: filled });
      this.emit({ type: 'POSITION_UPDATED', position });
      fills.push(fill);
    }

    for (const id of toRemove) this.openOrders.delete(id);

    // Update unrealized P&L for all open positions.
    const prices = new Map([[tick.symbol, tick.lastPrice]]);
    this.posTracker.updatePrices(prices, tick.timestamp);

    return fills;
  }

  getCashBalance(): string {
    return this.ledger.getBalance().toFixed(2);
  }

  getAvailableBalance(): string {
    return this.ledger.getAvailable().toFixed(2);
  }

  getPosition(symbol: string): Position | undefined {
    return this.posTracker.getPosition(symbol);
  }

  getAllPositions(): Position[] {
    return this.posTracker.getAllPositions();
  }

  getOpenOrders(): PaperOrder[] {
    return Array.from(this.openOrders.values());
  }

  getAllOrders(): PaperOrder[] {
    return Array.from(this.orders.values());
  }

  getPnLSnapshot(timestamp: string): PnLSnapshot {
    const cashBalance = this.ledger.getBalance();
    const positionValue = this.posTracker.getTotalPositionValue();
    const unrealizedPnl = this.posTracker.getTotalUnrealizedPnl();
    const realizedPnl = this.posTracker.getCumulativeRealizedPnl();

    const snapshot = this.pnlTracker.snapshot({
      runId: this.runId,
      agentId: this.agentId,
      cashBalance,
      positionValue,
      unrealizedPnl,
      realizedPnl,
      totalFeesPaid: this.totalFeesPaid,
      totalSlippagePaid: this.totalSlippagePaid,
      tradeCount: this.tradeCount,
      timestamp,
    });

    this.emit({ type: 'PNL_SNAPSHOT_CREATED', snapshot });
    return snapshot;
  }

  getPortfolioSummary(timestamp: string): PortfolioSummary {
    const cashBalance = this.ledger.getBalance();
    const positionValue = this.posTracker.getTotalPositionValue();
    const equity = cashBalance.plus(positionValue);
    const unrealizedPnl = this.posTracker.getTotalUnrealizedPnl();
    const realizedPnl = this.posTracker.getCumulativeRealizedPnl();

    const exposurePct = equity.gt(ZERO_MONEY)
      ? positionValue.div(equity).times('100')
      : ZERO_MONEY;

    // Use the pnlTracker's running high-water mark so drawdown reflects the
    // peak-to-trough from the true equity peak, not just max(startBal, currentEquity).
    const currentDrawdownPct = this.pnlTracker.getCurrentDrawdownPct(equity);

    return {
      agentId: this.agentId,
      cashBalance: cashBalance.toString(),
      equity: equity.toString(),
      totalPositionValue: positionValue.toString(),
      unrealizedPnl: unrealizedPnl.toString(),
      realizedPnl: realizedPnl.toString(),
      exposurePct: exposurePct.toString(),
      currentDrawdownPct: currentDrawdownPct.toString(),
      snapshotAt: timestamp,
    };
  }

  recordStrategySwitch(strategyId: string, timestamp = new Date().toISOString()): RiskEvent | null {
    this.pruneStrategySwitches(timestamp);
    this.strategySwitchTimestamps.push(timestamp);
    const decision = this.riskGate.evaluateStrategySwitch({
      runId: this.runId,
      agentId: this.agentId,
      timestamp,
      strategyId,
      strategySwitchesThisHour: this.strategySwitchTimestamps.length,
    });
    if (decision.decision === 'REJECTED') {
      this.emit({ type: 'RISK_CHECK_REJECTED', riskEvent: decision.event });
      return decision.event;
    }
    this.emit({ type: 'RISK_CHECK_PASSED', riskEvent: decision.event });
    return null;
  }

  private evaluateOrderRisk(req: PlaceOrderRequest, timestamp: string): { reason: string; event: RiskEvent } | null {
    this.pruneOrderAttempts(timestamp);
    const projectedOrdersThisMinute = this.orderAttemptTimestamps.length + 1;
    const decision = this.riskGate.evaluateOrder({
      runId: this.runId,
      agentId: this.agentId,
      timestamp,
      request: req,
      portfolio: this.getPortfolioSummary(timestamp),
      availableCash: this.ledger.getAvailable().toString(),
      positions: this.posTracker.getAllPositions(),
      ordersThisMinute: projectedOrdersThisMinute,
      strategySwitchesThisHour: this.currentStrategySwitches(timestamp),
    });
    this.orderAttemptTimestamps.push(timestamp);
    if (decision.decision === 'REJECTED') {
      this.emit({ type: 'RISK_CHECK_REJECTED', riskEvent: decision.event });
      return { reason: decision.event.ruleId ?? 'RISK_REJECTED', event: decision.event };
    }
    this.emit({ type: 'RISK_CHECK_PASSED', riskEvent: decision.event });
    return null;
  }

  private rejectOrder(req: PlaceOrderRequest, timestamp: string, reason: string, riskEvent?: RiskEvent): PaperOrder {
    const order = this.makeOrder(req, 'REJECTED', timestamp);
    this.orders.set(order.orderId, order);
    const event: BrokerEventPayload = riskEvent
      ? { type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason, riskEvent }
      : { type: 'PAPER_ORDER_REJECTED', orderId: order.orderId, reason };
    this.emit(event);
    return order;
  }

  private pruneOrderAttempts(timestamp: string): void {
    const cutoff = Date.parse(timestamp) - 60_000;
    this.orderAttemptTimestamps = this.orderAttemptTimestamps.filter((attemptedAt) => Date.parse(attemptedAt) > cutoff);
  }

  private pruneStrategySwitches(timestamp: string): void {
    const cutoff = Date.parse(timestamp) - 3_600_000;
    this.strategySwitchTimestamps = this.strategySwitchTimestamps.filter((switchedAt) => Date.parse(switchedAt) > cutoff);
  }

  private currentStrategySwitches(timestamp: string): number {
    this.pruneStrategySwitches(timestamp);
    return this.strategySwitchTimestamps.length;
  }

  private makeOrder(req: PlaceOrderRequest, status: PaperOrder['status'], timestamp: string): PaperOrder {
    const order: PaperOrder = {
      orderId: req.orderId ?? nanoid(),
      runId: this.runId,
      agentId: this.agentId,
      symbol: req.symbol,
      orderType: req.orderType,
      side: req.side,
      quantityUsd: req.quantityUsd,
      status,
      filledQuantityUsd: '0',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (req.limitPrice !== undefined) order.limitPrice = req.limitPrice;
    if (req.stopPrice !== undefined) order.stopPrice = req.stopPrice;
    if (req.decisionId !== undefined) order.decisionId = req.decisionId;
    return order;
  }

  private emit(event: BrokerEventPayload): void {
    this.onEvent?.(event);
  }
}
