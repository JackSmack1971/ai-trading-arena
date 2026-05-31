// All decimal money values are decimal strings for precision.
// Use MoneyDecimal for arithmetic; serialize to/from strings at boundaries.

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED';
export type PositionSide = 'LONG' | 'SHORT';

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
  side: OrderSide;
  quantityUsd: string;
  limitPrice?: string;
  stopPrice?: string;
  orderType: OrderType;
  decisionId?: string;
}

export interface PaperOrder {
  orderId: string;
  runId: string;
  agentId: string;
  symbol: string;
  orderType: OrderType;
  side: OrderSide;
  quantityUsd: string;
  limitPrice?: string;
  stopPrice?: string;
  status: OrderStatus;
  filledQuantityUsd: string;
  averageFillPrice?: string;
  decisionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaperFill {
  fillId: string;
  orderId: string;
  agentId: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
  price: string;
  fee: string;
  slippageBps: string;
  liquiditySource: string;
  timestamp: string;
}

export interface Position {
  positionId: string;
  runId: string;
  agentId: string;
  symbol: string;
  side: PositionSide;
  quantity: string;
  averageEntryPrice: string;
  currentPrice: string;
  unrealizedPnl: string;
  realizedPnl: string;
  openedAt: string;
  updatedAt: string;
}

export interface PnLSnapshot {
  snapshotId: string;
  runId: string;
  agentId: string;
  timestamp: string;
  equity: string;
  cashBalance: string;
  positionValue: string;
  unrealizedPnl: string;
  realizedPnl: string;
  totalReturnPct: string;
  maxDrawdownPct: string;
  totalFeesPaid: string;
  totalSlippagePaid: string;
  tradeCount: number;
}

export interface PortfolioSummary {
  agentId: string;
  cashBalance: string;
  equity: string;
  totalPositionValue: string;
  unrealizedPnl: string;
  realizedPnl: string;
  exposurePct: string;
  currentDrawdownPct: string;
  snapshotAt: string;
}

export type BrokerEventPayload =
  | { type: 'PAPER_ORDER_CREATED'; order: PaperOrder }
  | { type: 'PAPER_ORDER_CANCELLED'; order: PaperOrder }
  | { type: 'PAPER_ORDER_FILLED'; fill: PaperFill; order: PaperOrder }
  | { type: 'PAPER_ORDER_REJECTED'; orderId: string; reason: string }
  | { type: 'POSITION_UPDATED'; position: Position }
  | { type: 'PNL_SNAPSHOT_CREATED'; snapshot: PnLSnapshot };

export type BrokerEventHandler = (event: BrokerEventPayload) => void;
