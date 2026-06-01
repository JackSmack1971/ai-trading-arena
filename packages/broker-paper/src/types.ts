// Types shared with @arena/core — imported instead of redefined to prevent drift.
export type {
  OrderType,
  OrderSide,
  OrderStatus,
  PositionSide,
  PaperOrder,
  PaperFill,
  Position,
  PnLSnapshot,
  PortfolioSummary,
} from '@arena/core';

// Broker-paper-specific types that do not exist in @arena/core.

export interface MarketTick {
  symbol: string;
  timestamp: string;
  bid: string;
  ask: string;
  lastPrice: string;
}

export interface PlaceOrderRequest {
  orderId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantityUsd: string;
  limitPrice?: string;
  stopPrice?: string;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  decisionId?: string;
  executionMode?: 'PAPER' | 'LIVE';
  executionVenue?: 'PAPER' | 'REAL';
  leverageMultiplier?: string;
}

import type { PaperOrder, PaperFill, Position, PnLSnapshot, RiskEvent } from '@arena/core';

export type BrokerEventPayload =
  | { type: 'PAPER_ORDER_CREATED'; order: PaperOrder }
  | { type: 'PAPER_ORDER_CANCELLED'; order: PaperOrder }
  | { type: 'PAPER_ORDER_FILLED'; fill: PaperFill; order: PaperOrder }
  | { type: 'PAPER_ORDER_REJECTED'; orderId: string; reason: string; riskEvent?: RiskEvent }
  | { type: 'RISK_CHECK_REJECTED'; riskEvent: RiskEvent }
  | { type: 'POSITION_UPDATED'; position: Position }
  | { type: 'PNL_SNAPSHOT_CREATED'; snapshot: PnLSnapshot };

export type BrokerEventHandler = (event: BrokerEventPayload) => void;
