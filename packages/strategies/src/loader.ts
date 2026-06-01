import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { ZodType } from 'zod';
import { loadManifest, ManifestValidationError, validateManifestInputs } from './manifest.js';
import type { Strategy, StrategyManifest } from './types.js';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class StrategyLoadRejectedError extends Error {
  constructor(
    public readonly strategyPath: string,
    public readonly reason: string,
  ) {
    super(`Strategy load rejected [${strategyPath}]: ${reason}`);
    this.name = 'StrategyLoadRejectedError';
  }
}

// ---------------------------------------------------------------------------
// Scanner configuration
// ---------------------------------------------------------------------------

/**
 * Node built-in modules that strategies must never import.
 * This list covers all dangerous capabilities: filesystem, network, process
 * spawning, dynamic code evaluation, and VM escape.
 */
const FORBIDDEN_MODULES = new Set([
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'net',
  'node:net',
  'http',
  'node:http',
  'https',
  'node:https',
  'http2',
  'node:http2',
  'child_process',
  'node:child_process',
  'cluster',
  'node:cluster',
  'dgram',
  'node:dgram',
  'dns',
  'node:dns',
  'tls',
  'node:tls',
  'vm',
  'node:vm',
  'worker_threads',
  'node:worker_threads',
  'os',
  'node:os',
  'process',
  'node:process',
]);

/**
 * Third-party packages that strategies ARE allowed to import.
 * All other external (non-relative) imports are rejected.
 */
const ALLOWED_PACKAGES = new Set([
  'decimal.js',
  'technicalindicators',
  'simple-statistics',
  'date-fns',
  'ts-pattern',
  'zod',
  'yaml',
]);

/**
 * Forbidden global identifiers — using these in strategy source indicates
 * an attempt to escape the restricted context.
 *
 * IMPORTANT: Ordered longest-first so that substrings don't shadow longer matches
 * (e.g. 'globalThis' must appear before 'global').
 */
const FORBIDDEN_GLOBALS = [
  'import.meta.url',
  '__filename',
  '__dirname',
  'globalThis',
  'Function(',  // dynamic function construction
  'process',
  'global',
  'eval',
];

// ---------------------------------------------------------------------------
// Static scanner
// ---------------------------------------------------------------------------

/**
 * Parses the specifier out of a static `import ... from 'specifier'` statement
 * and dynamic `import('specifier')` call.
 *
 * Returns the module specifier string, or null if no match.
 */
function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  // Static imports:  import ... from 'specifier'  |  import 'specifier'
  const staticRe = /\bimport\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(source)) !== null) {
    specifiers.push(m[1]!);
  }

  // Dynamic imports: import('specifier')
  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicRe.exec(source)) !== null) {
    specifiers.push(m[1]!);
  }

  // require('specifier')
  const requireRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(source)) !== null) {
    specifiers.push(m[1]!);
  }

  return specifiers;
}

/**
 * Runs a static analysis pass over strategy source code.
 * Throws `StrategyLoadRejectedError` on the first violation found.
 */
export function scanSource(source: string, filePath: string): void {
  // 1. Check import specifiers FIRST — so that forbidden module names in import
  //    strings are caught before the globals scanner runs and mistakes substrings
  //    (e.g. 'process' inside 'child_process') for global references.
  const specifiers = extractImportSpecifiers(source);
  for (const spec of specifiers) {
    // Relative imports are always allowed
    if (spec.startsWith('.') || spec.startsWith('/')) continue;

    // Check forbidden built-ins
    if (FORBIDDEN_MODULES.has(spec)) {
      throw new StrategyLoadRejectedError(
        filePath,
        `Import of forbidden module: "${spec}"`,
      );
    }

    // Resolve the base package name (e.g. 'date-fns/format' → 'date-fns')
    const basePkg = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : (spec.split('/')[0] ?? spec);

    if (!ALLOWED_PACKAGES.has(basePkg)) {
      throw new StrategyLoadRejectedError(
        filePath,
        `Import of non-allowlisted package: "${spec}" (base: "${basePkg}")`,
      );
    }
  }

  // 2. Check forbidden globals.
  //    Strip string literals first to avoid false positives on import specifiers
  //    that were already validated above (e.g. 'child_process' as a string value).
  const stripped = source.replace(/(['"`])(?:(?!\1)[\s\S])*\1/g, (m) => ' '.repeat(m.length));
  for (const forbidden of FORBIDDEN_GLOBALS) {
    if (stripped.includes(forbidden)) {
      throw new StrategyLoadRejectedError(
        filePath,
        `Forbidden global reference: "${forbidden}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export interface LoadedStrategy {
  strategy: Strategy;
  manifest: StrategyManifest;
  resolvedInputs: Record<string, unknown>;
}

/**
 * Loads a strategy from a directory containing `manifest.yaml` and the entry
 * TypeScript/JavaScript file referenced by `manifest.entry`.
 *
 * Steps:
 *  1. Parse and validate `manifest.yaml`
 *  2. Resolve the entry file path
 *  3. Static-scan the entry file source for forbidden imports/globals
 *  4. Dynamically import the module
 *  5. Validate the exported `strategy` object shape
 *
 * @param strategyDir  Absolute path to the strategy directory.
 */
export async function loadStrategy(strategyDir: string): Promise<LoadedStrategy> {
  const manifestPath = resolve(strategyDir, 'manifest.yaml');
  const manifest = loadManifest(manifestPath);

  const entryPath = resolve(strategyDir, manifest.entry);

  // Static scan — must happen before dynamic import
  let source: string;
  try {
    source = readFileSync(entryPath, 'utf8');
  } catch (err) {
    throw new StrategyLoadRejectedError(
      entryPath,
      `Cannot read entry file: ${(err as Error).message}`,
    );
  }

  scanSource(source, entryPath);

  // Dynamic import
  const fileUrl = pathToFileURL(entryPath).href;
  let mod: Record<string, unknown>;
  try {
    mod = (await import(fileUrl)) as Record<string, unknown>;
  } catch (err) {
    throw new StrategyLoadRejectedError(
      entryPath,
      `Module import failed: ${(err as Error).message}`,
    );
  }

  // Validate exported strategy shape
  const strategy = (mod['strategy'] ?? mod['default']) as Strategy | undefined;
  if (!strategy || typeof strategy !== 'object') {
    throw new StrategyLoadRejectedError(
      entryPath,
      'Module must export a `strategy` (or default) object implementing the Strategy interface',
    );
  }
  if (typeof strategy.onMarketEvent !== 'function') {
    throw new StrategyLoadRejectedError(
      entryPath,
      'Exported strategy object is missing required method `onMarketEvent`',
    );
  }

  let resolvedInputs: Record<string, unknown>;
  const inputsSchema = mod['inputsSchema'];
  if (
    typeof inputsSchema === 'object' &&
    inputsSchema !== null &&
    'safeParse' in inputsSchema &&
    typeof inputsSchema.safeParse === 'function'
  ) {
    try {
      resolvedInputs = validateManifestInputs(
        manifest,
        inputsSchema as ZodType<Record<string, unknown>>,
      ) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof ManifestValidationError) {
        throw new StrategyLoadRejectedError(
          entryPath,
          `Manifest inputs failed validation: ${err.issues.join('; ')}`,
        );
      }
      throw err;
    }
  } else {
    resolvedInputs = manifest.inputs ?? {};
  }

  return { strategy, manifest, resolvedInputs };
}
