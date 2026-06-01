import { describe, it, expect } from 'vitest';
import { scanSource, StrategyLoadRejectedError } from '../loader.js';

// ---------------------------------------------------------------------------
// Helper to run scanSource and capture the thrown error
// ---------------------------------------------------------------------------

function expectScanToReject(source: string): StrategyLoadRejectedError {
  try {
    scanSource(source, '<test>');
  } catch (err) {
    expect(err).toBeInstanceOf(StrategyLoadRejectedError);
    return err as StrategyLoadRejectedError;
  }
  throw new Error('Expected scanSource to throw but it did not');
}

function expectScanToPass(source: string): void {
  expect(() => scanSource(source, '<test>')).not.toThrow();
}

// ---------------------------------------------------------------------------
// T-02-01: Forbidden built-in module imports must be rejected
// ---------------------------------------------------------------------------

describe('T-02-01: Forbidden module imports', () => {
  it('rejects static import of fs', () => {
    const err = expectScanToReject(`import fs from 'fs';`);
    expect(err.reason).toContain('fs');
  });

  it('rejects static import of node:fs', () => {
    const err = expectScanToReject(`import { readFileSync } from 'node:fs';`);
    expect(err.reason).toContain('node:fs');
  });

  it('rejects static import of fs/promises', () => {
    const err = expectScanToReject(`import { readFile } from 'fs/promises';`);
    expect(err.reason).toContain('fs/promises');
  });

  it('rejects static import of http', () => {
    const err = expectScanToReject(`import http from 'http';`);
    expect(err.reason).toContain('http');
  });

  it('rejects static import of https', () => {
    const err = expectScanToReject(`import https from 'https';`);
    expect(err.reason).toContain('https');
  });

  it('rejects static import of net', () => {
    const err = expectScanToReject(`import net from 'net';`);
    expect(err.reason).toContain('net');
  });

  it('rejects static import of child_process', () => {
    const err = expectScanToReject(`import { exec } from 'child_process';`);
    expect(err.reason).toContain('child_process');
  });

  it('rejects static import of vm', () => {
    const err = expectScanToReject(`import vm from 'vm';`);
    expect(err.reason).toContain('vm');
  });

  it('rejects static import of worker_threads', () => {
    const err = expectScanToReject(`import { Worker } from 'worker_threads';`);
    expect(err.reason).toContain('worker_threads');
  });

  it('rejects dynamic import of fs', () => {
    const err = expectScanToReject(`const mod = await import('fs');`);
    expect(err.reason).toContain('fs');
  });

  it('rejects require of fs', () => {
    // CommonJS-style require
    const err = expectScanToReject(`const fs = require('fs');`);
    expect(err.reason).toContain('fs');
  });
});

// ---------------------------------------------------------------------------
// T-02-02: Forbidden global identifiers must be rejected
// ---------------------------------------------------------------------------

describe('T-02-02: Forbidden global identifiers', () => {
  it('rejects reference to process.env', () => {
    const err = expectScanToReject(`const key = process.env.SECRET_KEY;`);
    expect(err.reason).toContain('process');
  });

  it('rejects reference to globalThis', () => {
    const err = expectScanToReject(`globalThis.myProp = 'hack';`);
    expect(err.reason).toContain('globalThis');
  });

  it('rejects reference to global', () => {
    const err = expectScanToReject(`global.myProp = 'hack';`);
    expect(err.reason).toContain('global');
  });

  it('rejects use of eval', () => {
    const err = expectScanToReject(`eval('malicious code');`);
    expect(err.reason).toContain('eval');
  });

  it('rejects dynamic Function construction', () => {
    const err = expectScanToReject(`const fn = new Function('return 42');`);
    expect(err.reason).toContain('Function(');
  });

  it('rejects __dirname reference', () => {
    const err = expectScanToReject(`const p = __dirname + '/file';`);
    expect(err.reason).toContain('__dirname');
  });

  it('rejects __filename reference', () => {
    const err = expectScanToReject(`const p = __filename;`);
    expect(err.reason).toContain('__filename');
  });

  it('rejects import.meta.url reference', () => {
    const err = expectScanToReject(`const url = import.meta.url;`);
    expect(err.reason).toContain('import.meta.url');
  });
});

// ---------------------------------------------------------------------------
// T-02-03: Allowlisted package imports must succeed; non-allowlist must fail
// ---------------------------------------------------------------------------

describe('T-02-03: Import allowlist', () => {
  it('allows relative imports', () => {
    expectScanToPass(`import { computeRsi } from '../indicators.js';`);
  });

  it('allows decimal.js', () => {
    expectScanToPass(`import Decimal from 'decimal.js';`);
  });

  it('allows zod', () => {
    expectScanToPass(`import { z } from 'zod';`);
  });

  it('allows date-fns subpath', () => {
    expectScanToPass(`import { format } from 'date-fns/format';`);
  });

  it('allows technicalindicators', () => {
    expectScanToPass(`import { RSI } from 'technicalindicators';`);
  });

  it('allows simple-statistics', () => {
    expectScanToPass(`import { mean } from 'simple-statistics';`);
  });

  it('allows yaml', () => {
    expectScanToPass(`import { parse } from 'yaml';`);
  });

  it('allows ts-pattern', () => {
    expectScanToPass(`import { match } from 'ts-pattern';`);
  });

  it('rejects non-allowlisted package: axios', () => {
    const err = expectScanToReject(`import axios from 'axios';`);
    expect(err.reason).toContain('axios');
  });

  it('rejects non-allowlisted package: node-fetch', () => {
    const err = expectScanToReject(`import fetch from 'node-fetch';`);
    expect(err.reason).toContain('node-fetch');
  });

  it('rejects non-allowlisted scoped package: @aws-sdk/client-s3', () => {
    const err = expectScanToReject(`import { S3Client } from '@aws-sdk/client-s3';`);
    expect(err.reason).toContain('@aws-sdk/client-s3');
  });
});

// ---------------------------------------------------------------------------
// Clean strategy source — must pass
// ---------------------------------------------------------------------------

describe('Clean strategy passes scanner', () => {
  it('accepts a well-formed strategy with only allowed imports', () => {
    const clean = `
import Decimal from 'decimal.js';
import { computeRsi } from '../indicators.js';
import type { Strategy } from '../types.js';

export const strategy: Strategy = {
  id: 'clean-strategy',
  name: 'Clean Strategy',
  version: '0.1.0',
  onStart(_ctx) {},
  onMarketEvent(_event, ctx) {
    const bars = ctx.marketState.recentBars;
    return [];
  },
};
    `;
    expectScanToPass(clean);
  });
});
