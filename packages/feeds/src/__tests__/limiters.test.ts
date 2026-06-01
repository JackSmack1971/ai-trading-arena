import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger to avoid pino side-effects in tests
vi.mock('../logger.js', () => ({
  feedLogger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('feed limiters', () => {
  it('binanceLimiter has correct maxConcurrent and minTime', async () => {
    const { binanceLimiter } = await import('../limiters.js');
    // @ts-ignore — accessing internal options for verification
    const options = (binanceLimiter as any)._options ?? (binanceLimiter as any).options;
    expect(options.maxConcurrent).toBe(1);
    expect(options.minTime).toBe(200);
  });

  it('coinbaseLimiter has correct maxConcurrent and minTime', async () => {
    const { coinbaseLimiter } = await import('../limiters.js');
    // @ts-ignore — accessing internal options for verification
    const options = (coinbaseLimiter as any)._options ?? (coinbaseLimiter as any).options;
    expect(options.maxConcurrent).toBe(1);
    expect(options.minTime).toBe(200);
  });

  it('binanceLimiter has reservoir configured', async () => {
    const { binanceLimiter } = await import('../limiters.js');
    // @ts-ignore
    const options = (binanceLimiter as any)._options ?? (binanceLimiter as any).options;
    expect(options.reservoir).toBe(5);
    expect(options.reservoirRefreshAmount).toBe(5);
    expect(options.reservoirRefreshInterval).toBe(1_000);
  });

  it('coinbaseLimiter has reservoir configured', async () => {
    const { coinbaseLimiter } = await import('../limiters.js');
    // @ts-ignore
    const options = (coinbaseLimiter as any)._options ?? (coinbaseLimiter as any).options;
    expect(options.reservoir).toBe(5);
    expect(options.reservoirRefreshAmount).toBe(5);
    expect(options.reservoirRefreshInterval).toBe(1_000);
  });

  it('limiter schedules and executes a job', async () => {
    const { binanceLimiter } = await import('../limiters.js');
    const result = await binanceLimiter.schedule({ id: 'test:job' }, () => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });
});
