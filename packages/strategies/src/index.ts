export type {
  SignalDirection,
  StrategySignal,
  BarData,
  OrderBookLevel,
  OrderBookSummary,
  MarketStateSummary,
  PortfolioSummary,
  StrategyDescriptor,
  StrategyManifest,
  StrategyManifestPermissions,
  NormalizedMarketEvent,
  NormalizedEventType,
  PositionUpdate,
  StrategyContext,
  Strategy,
} from './types.js';

export { StrategyManifestSchema, StrategyManifestPermissionsSchema, StrategySignalSchema } from './schemas.js';

export { computeEma, computeRsi, computeBollingerBands } from './indicators.js';
export type { BollingerBands } from './indicators.js';

export {
  ManifestValidationError,
  loadManifest,
  parseManifestYaml,
  validateManifestInputs,
} from './manifest.js';

export { StrategyRegistry } from './registry.js';
export { defaultRegistry, createDefaultRegistry } from './default-registry.js';

export {
  StrategyLoadRejectedError,
  scanSource,
  loadStrategy,
} from './loader.js';
export type { LoadedStrategy } from './loader.js';

export { strategyLogger } from './logger.js';
export {
  STRATEGY_SIGNAL_CREATED_TYPE,
  toStrategySignalEvent,
} from './signal-events.js';

export {
  StrategyExecutor,
  SignalValidationError,
  DEFAULT_HISTORY_LIMIT,
} from './executor.js';

export { doNothingBaseline } from './built-ins/do-nothing-baseline.js';
export { momentumBasic } from './built-ins/momentum-basic.js';
export { meanReversionBasic } from './built-ins/mean-reversion-basic.js';
export { volatilityBreakout } from './built-ins/volatility-breakout.js';
export { orderbookImbalance } from './built-ins/orderbook-imbalance.js';
