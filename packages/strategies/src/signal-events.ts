import { SignalValidationError } from './executor.js';
import { StrategySignalSchema } from './schemas.js';
import type { StrategySignal } from './types.js';

export const STRATEGY_SIGNAL_CREATED_TYPE = 'STRATEGY_SIGNAL_CREATED';

export function toStrategySignalEvent(signal: StrategySignal): {
  type: string;
  source: string;
  payload: StrategySignal;
  timestamp: string;
} {
  const result = StrategySignalSchema.safeParse(signal);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new SignalValidationError(signal.strategyId, issues);
  }

  return {
    type: STRATEGY_SIGNAL_CREATED_TYPE,
    source: signal.strategyId,
    payload: result.data,
    timestamp: signal.createdAt,
  };
}
