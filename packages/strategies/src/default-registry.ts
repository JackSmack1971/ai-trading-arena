import { doNothingBaseline } from './built-ins/do-nothing-baseline.js';
import { momentumBasic } from './built-ins/momentum-basic.js';
import { meanReversionBasic } from './built-ins/mean-reversion-basic.js';
import { volatilityBreakout } from './built-ins/volatility-breakout.js';
import { orderbookImbalance } from './built-ins/orderbook-imbalance.js';
import { StrategyRegistry } from './registry.js';

export function createDefaultRegistry(): StrategyRegistry {
  const registry = new StrategyRegistry();
  registry.register(doNothingBaseline);
  registry.register(momentumBasic);
  registry.register(meanReversionBasic);
  registry.register(volatilityBreakout);
  registry.register(orderbookImbalance);
  return registry;
}

export const defaultRegistry = createDefaultRegistry();
