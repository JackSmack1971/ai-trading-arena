// Money / Decimal
export {
  MoneyDecimal,
  ZERO_MONEY,
  MONEY_ROUNDING_MODE,
  MONEY_PRECISION,
  MONEY_SCALE_USD,
  MONEY_SCALE_CRYPTO,
  roundForLedger,
  roundForDisplay,
  roundForSettlement,
} from './money/decimal.js';
export type { MoneyDecimal as MoneyDecimalType } from './money/decimal.js';

// Common primitives
export {
  TimestampSchema,
  DecimalStringSchema,
  NonNegativeDecimalStringSchema,
  PositiveDecimalStringSchema,
  PercentStringSchema,
  BpsStringSchema,
  RunIdSchema,
  AgentIdSchema,
  OrderIdSchema,
  FillIdSchema,
  SignalIdSchema,
  StrategyIdSchema,
  SymbolSchema,
  EventIdSchema,
} from './schemas/common.js';
export type {
  Timestamp,
  DecimalString,
  NonNegativeDecimalString,
  PositiveDecimalString,
  PercentString,
  BpsString,
  RunId,
  AgentId,
  OrderId,
  FillId,
  SignalId,
  StrategyId,
  EventId,
} from './schemas/common.js';

// Instrument / Feed
export {
  FeedCapabilitySchema,
  RateLimitScopeSchema,
  RateLimitSchema,
  RatePolicySchema,
  MarketTypeSchema,
  InstrumentSchema,
  FeedConfigSchema,
} from './schemas/instrument.js';
export type {
  FeedCapability,
  RateLimitScope,
  RateLimit,
  RatePolicy,
  MarketType,
  Instrument,
  FeedConfig,
} from './schemas/instrument.js';

// Market events
export {
  RawMarketEventTypeSchema,
  MarketEventSchema,
  NormalizedEventTypeSchema,
  NormalizedMarketEventSchema,
  BarDataSchema,
  OrderBookLevelSchema,
  OrderBookSummarySchema,
  MarketStateSummarySchema,
} from './schemas/market.js';
export type {
  RawMarketEventType,
  MarketEvent,
  NormalizedEventType,
  NormalizedMarketEvent,
  BarData,
  OrderBookLevel,
  OrderBookSummary,
  MarketStateSummary,
} from './schemas/market.js';

// Strategy
export {
  SignalDirectionSchema,
  StrategySignalSchema,
  StrategyDescriptorSchema,
  StrategyManifestPermissionsSchema,
  StrategyManifestSchema,
  StrategyRiskConfigSchema,
  StrategyDslSchema,
  PositionUpdateSchema,
} from './schemas/strategy.js';
export type {
  SignalDirection,
  StrategySignal,
  StrategyDescriptor,
  StrategyManifestPermissions,
  StrategyManifest,
  StrategyRiskConfig,
  StrategyDsl,
  PositionUpdate,
} from './schemas/strategy.js';

// Broker
export {
  OrderTypeSchema,
  OrderSideSchema,
  OrderStatusSchema,
  PaperOrderSchema,
  PaperFillSchema,
  PositionSideSchema,
  PositionSchema,
  PnLSnapshotSchema,
  TradeSummarySchema,
  PortfolioSummarySchema,
  PositionSnapshotSchema,
  PnLSummarySchema,
  OrderRecordSchema,
  OrderHistoryPageSchema,
  AgentTelemetrySnapshotSchema,
} from './schemas/broker.js';
export type {
  OrderType,
  OrderSide,
  OrderStatus,
  PaperOrder,
  PaperFill,
  PositionSide,
  Position,
  PnLSnapshot,
  TradeSummary,
  PortfolioSummary,
  PositionSnapshot,
  PnLSummary,
  OrderRecord,
  OrderHistoryPage,
  AgentTelemetrySnapshot,
} from './schemas/broker.js';

// Risk
export {
  RiskRuleIdSchema,
  RiskConfigSchema,
  DefaultRiskConfig,
  RiskStateSchema,
  RiskDecisionSchema,
  RiskEventSchema,
} from './schemas/risk.js';
export type {
  RiskRuleId,
  RiskConfig,
  RiskState,
  RiskDecision,
  RiskEvent,
} from './schemas/risk.js';

// Agent
export {
  AgentActionNameSchema,
  AgentDecisionThesisSchema,
  AgentDecisionRiskSchema,
  AgentDecisionSchema,
  AgentObservationSchema,
  AgentConfigSchema,
} from './schemas/agent.js';
export type {
  AgentActionName,
  AgentDecisionThesis,
  AgentDecisionRisk,
  AgentDecision,
  AgentObservation,
  AgentConfig,
} from './schemas/agent.js';

// Event sourcing
export {
  SimEventTypeSchema,
  SimEventSchema,
  MarketTickPayloadSchema,
  StrategySignalPayloadSchema,
  AgentDecisionRequestedPayloadSchema,
  AgentDecisionReceivedPayloadSchema,
  AgentDecisionInvalidPayloadSchema,
  RiskCheckPayloadSchema,
  PaperOrderPayloadSchema,
  PaperFillPayloadSchema,
  PositionUpdatedPayloadSchema,
  PnLSnapshotPayloadSchema,
  StrategySwitchedPayloadSchema,
  StrategySwitchRequestedPayloadSchema,
  SimEventPayloadSchemas,
  RateLimitDelayedPayloadSchema,
  FeedConnectionPayloadSchema,
} from './events/types.js';
export type {
  SimEventType,
  SimEvent,
  MarketTickPayload,
  StrategySignalPayload,
  AgentDecisionRequestedPayload,
  AgentDecisionReceivedPayload,
  AgentDecisionInvalidPayload,
  RiskCheckPayload,
  PaperOrderPayload,
  PaperFillPayload,
  PositionUpdatedPayload,
  PnLSnapshotPayload,
  StrategySwitchedPayload,
  StrategySwitchRequestedPayload,
  RateLimitDelayedPayload,
  FeedConnectionPayload,
} from './events/types.js';

// Event bus
export { SimEventBus, createEventBus, describeEventType } from './events/bus.js';
export type { BusEvents } from './events/bus.js';

// Interfaces
export type { MarketFeedAdapter, StrategyContext, Strategy } from './interfaces.js';

// Constants
export {
  REAL_TRADING_ENABLED,
  SIMULATOR_VERSION,
  DEFAULT_STARTING_BALANCE_USD,
  AGENT_DECISION_TIMEOUT_MS,
  MAX_AGENT_THESIS_LENGTH,
  MAX_BARS_IN_OBSERVATION,
  MAX_OPEN_ORDERS_PER_AGENT,
  HEARTBEAT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS,
} from './constants.js';
