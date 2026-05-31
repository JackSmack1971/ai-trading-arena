#!/usr/bin/env tsx
// scripts/create-strategy.ts — scaffold a new strategy pack
// Usage: pnpm strategy:create --id my-strategy --name "My Strategy"
//        pnpm strategy:create --id my-strategy --name "My Strategy" --description "What it does"

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg !== undefined && arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

function validateId(id: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    console.error(`Error: id must be kebab-case lowercase (e.g. my-strategy). Got: "${id}"`);
    process.exit(1);
  }
  if (id.length > 64) {
    console.error(`Error: id must be 64 characters or fewer.`);
    process.exit(1);
  }
}

function manifestYaml(id: string, name: string, description: string): string {
  const descLine = description ? `description: "${description}"\n` : '';
  return `id: ${id}
name: "${name}"
${descLine}version: 0.1.0
entry: strategy.ts
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
`;
}

function strategyTemplate(id: string, name: string): string {
  const className = id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `// ${name} — signal-only strategy (no order emission permitted).
// Edit onMarketEvent to emit typed signals based on market conditions.
// Import only allowed helpers: indicator math, ctx.marketState, ctx.portfolio.

import type {
  NormalizedMarketEvent,
  Strategy,
  StrategyContext,
  StrategySignal,
} from '../../packages/strategies/src/types.js';

const ID = '${id}';
const VERSION = '0.1.0';

export const ${className}: Strategy = {
  id: ID,
  name: '${name}',
  version: VERSION,

  onStart(_ctx: StrategyContext): void {
    // Called once when the strategy is activated. Set up any state here.
  },

  onMarketEvent(event: NormalizedMarketEvent, ctx: StrategyContext): StrategySignal[] {
    const bars = ctx.marketState.recentBars;

    // Replace this with real signal logic.
    // Return [] to emit no signal (equivalent to NOOP for this tick).
    void bars;
    void event;
    return [];
  },
};

export default ${className};
`;
}

function readmeMd(id: string, name: string, description: string): string {
  return `# ${name}

${description || 'A custom strategy for the AI Trading Arena.'}

## Signal logic

Describe your signal logic here.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| —         | —       | Add your parameters |

## Permissions

This strategy runs in signal-only mode:
- \`network: false\` — no outbound HTTP
- \`filesystem: false\` — no file access
- \`can_emit_orders: false\` — signals only; agents convert signals to trade intents
- \`can_emit_signals: true\`
`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const id = args['id'];
  const name = args['name'];
  const description = args['description'] ?? '';

  if (!id) {
    console.error('Usage: pnpm strategy:create --id <id> --name "<name>" [--description "<desc>"]');
    process.exit(1);
  }
  if (!name) {
    console.error('Usage: pnpm strategy:create --id <id> --name "<name>" [--description "<desc>"]');
    process.exit(1);
  }

  validateId(id);

  const dir = join(REPO_ROOT, 'strategies', id);
  const testsDir = join(dir, 'tests');

  if (existsSync(dir)) {
    console.error(`Error: strategy directory already exists: ${dir}`);
    process.exit(1);
  }

  mkdirSync(testsDir, { recursive: true });

  writeFileSync(join(dir, 'manifest.yaml'), manifestYaml(id, name, description), 'utf8');
  writeFileSync(join(dir, 'strategy.ts'), strategyTemplate(id, name), 'utf8');
  writeFileSync(join(dir, 'README.md'), readmeMd(id, name, description), 'utf8');

  console.log(`\nCreated strategy pack: strategies/${id}/`);
  console.log(`  manifest.yaml  — Zod-validated permissions manifest`);
  console.log(`  strategy.ts    — TypeScript strategy implementation`);
  console.log(`  README.md      — Documentation template`);
  console.log(`  tests/         — Add Vitest tests here`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit strategies/${id}/strategy.ts to implement signal logic`);
  console.log(`  2. Add tests in strategies/${id}/tests/`);
  console.log(`  3. Register with: registry.register((await import('./strategies/${id}/strategy.ts')).default)`);
}

main();
