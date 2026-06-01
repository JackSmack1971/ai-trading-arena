import Bottleneck from 'bottleneck';
import type { RatePolicy } from '@arena/core';
import { feedLogger } from './logger.js';

export interface FeedLimiterScheduleOptions {
  id: string;
  weight?: number;
  expiration?: number;
}

export class FeedRateLimiter {
  private readonly limiter: Bottleneck;

  constructor(
    private readonly policy: RatePolicy,
    private readonly quotaClass: 'ws' | 'rest' = 'ws',
  ) {
    const requestLimit = policy.limits.find((limit) => limit.scope === 'request') ?? policy.limits[0];
    const minTime = requestLimit ? Math.ceil(requestLimit.intervalMs / requestLimit.max) : 0;
    const id = `feed:${policy.provider}:${quotaClass}`;

    const options: Bottleneck.ConstructorOptions = requestLimit
      ? {
        id,
        maxConcurrent: 1,
        minTime,
        reservoir: requestLimit.max,
        reservoirRefreshAmount: requestLimit.max,
        reservoirRefreshInterval: requestLimit.intervalMs,
      }
      : {
        id,
        maxConcurrent: 1,
        minTime,
      };

    this.limiter = new Bottleneck(options);
    this.registerTelemetryHandlers(id);
  }

  schedule<T>(options: FeedLimiterScheduleOptions, task: () => T | Promise<T>): Promise<T> {
    return this.limiter.schedule(
      {
        id: options.id,
        weight: options.weight ?? 1,
        expiration: options.expiration ?? 30_000,
      },
      async () => task(),
    );
  }

  async stop(dropWaitingJobs = false): Promise<void> {
    await this.limiter.stop({ dropWaitingJobs });
  }

  private registerTelemetryHandlers(limiterId: string): void {
    const bindings = {
      provider: this.policy.provider,
      quotaClass: this.quotaClass,
      limiterId,
    };

    this.limiter.on('error', (err) => {
      feedLogger.error({ ...bindings, err, event: 'feed.rate_limiter_error' }, 'Feed rate limiter error');
    });
    this.limiter.on('depleted', (empty) => {
      feedLogger.warn({ ...bindings, empty, event: 'feed.rate_limiter_depleted' }, 'Feed rate limiter reservoir depleted');
    });
    this.limiter.on('failed', (err, jobInfo) => {
      feedLogger.warn(
        { ...bindings, err, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount, event: 'feed.rate_limiter_job_failed' },
        'Feed rate-limited job failed',
      );
    });
    this.limiter.on('retry', (err, jobInfo) => {
      feedLogger.warn(
        { ...bindings, err, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount, event: 'feed.rate_limiter_retry' },
        'Retrying feed rate-limited job',
      );
    });
  }
}

const feedLimiters = new Map<string, FeedRateLimiter>();

export function getFeedRateLimiter(policy: RatePolicy, quotaClass: 'ws' | 'rest' = 'ws'): FeedRateLimiter {
  const key = `feed:${policy.provider}:${quotaClass}`;
  let limiter = feedLimiters.get(key);
  if (!limiter) {
    limiter = new FeedRateLimiter(policy, quotaClass);
    feedLimiters.set(key, limiter);
  }
  return limiter;
}

export async function stopFeedRateLimiters(dropWaitingJobs = false): Promise<void> {
  const limiters = Array.from(feedLimiters.values());
  feedLimiters.clear();
  await Promise.all(limiters.map((limiter) => limiter.stop(dropWaitingJobs)));
}
