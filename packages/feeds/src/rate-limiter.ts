import Bottleneck from 'bottleneck';
import type { RatePolicy } from '@arena/core';
import { feedLogger } from './logger.js';

export class FeedRateLimiter {
  private readonly limiter: Bottleneck;
  private readonly provider: string;

  constructor(policy: RatePolicy) {
    this.provider = policy.provider;
    const requestLimit = policy.limits.find((limit) => limit.scope === 'request') ?? policy.limits[0];
    const minTime = requestLimit ? Math.ceil(requestLimit.intervalMs / requestLimit.max) : 0;

    const options: Bottleneck.ConstructorOptions = requestLimit
      ? {
        id: `feed-${policy.provider}`,
        maxConcurrent: 1,
        minTime,
        reservoir: requestLimit.max,
        reservoirRefreshAmount: requestLimit.max,
        reservoirRefreshInterval: requestLimit.intervalMs,
      }
      : {
        id: `feed-${policy.provider}`,
        maxConcurrent: 1,
        minTime,
      };

    this.limiter = new Bottleneck(options);

    this.limiter.on('error', (err) => {
      feedLogger.error({ err, provider: this.provider, event: 'feed.rate_limiter_error' }, 'Feed rate limiter error');
    });
    this.limiter.on('failed', (err, jobInfo) => {
      feedLogger.warn(
        { err, provider: this.provider, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount, event: 'feed.rate_limiter_job_failed' },
        'Feed rate-limited job failed',
      );
    });
    this.limiter.on('retry', (err, jobInfo) => {
      feedLogger.warn(
        { err, provider: this.provider, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount, event: 'feed.rate_limiter_retry' },
        'Retrying feed rate-limited job',
      );
    });
  }

  schedule<T>(id: string, task: () => T | Promise<T>): Promise<T> {
    return this.limiter.schedule({ id }, async () => task());
  }

  async stop(): Promise<void> {
    await this.limiter.stop({ dropWaitingJobs: false });
  }
}
