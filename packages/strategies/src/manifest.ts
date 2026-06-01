import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { StrategyManifestSchema } from './schemas.js';
import type { StrategyManifest } from './types.js';

export class ManifestValidationError extends Error {
  constructor(
    public readonly manifestPath: string,
    public readonly issues: string[],
  ) {
    super(`Invalid manifest at ${manifestPath}: ${issues.join('; ')}`);
    this.name = 'ManifestValidationError';
  }
}

function parseResult(path: string, raw: unknown): StrategyManifest {
  const result = StrategyManifestSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new ManifestValidationError(path, issues);
  }
  return result.data;
}

export function loadManifest(manifestPath: string): StrategyManifest {
  const content = readFileSync(manifestPath, 'utf8');
  return parseResult(manifestPath, parse(content) as unknown);
}

export function parseManifestYaml(yaml: string): StrategyManifest {
  return parseResult('<string>', parse(yaml) as unknown);
}

export function validateManifestInputs<T>(
  manifest: StrategyManifest,
  inputsSchema: z.ZodType<T>,
): T {
  const result = inputsSchema.safeParse(manifest.inputs ?? {});
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new ManifestValidationError(manifest.id, issues);
  }
  return result.data;
}
