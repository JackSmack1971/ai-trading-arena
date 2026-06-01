// Single source of truth for strategy schemas lives in @arena/core.
// Re-export here to preserve the public API of @arena/strategies.
export {
  StrategyManifestPermissionsSchema,
  StrategyManifestSchema,
  StrategySignalSchema,
} from '@arena/core';

import type { ZodType } from 'zod';
export type StrategyInputsSchema = ZodType<Record<string, unknown>>;
