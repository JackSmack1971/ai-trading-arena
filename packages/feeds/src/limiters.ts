import Bottleneck from 'bottleneck';
import { feedLogger } from './logger.js';

function makeFeedLimiter(provider: string): Bottleneck {
  const id = `feed:${provider}:ws`;
  const logger = feedLogger.child({ limiter: id });

  const limiter = new Bottleneck({
    id,
    maxConcurrent: 1,
    minTime: 200,
    reservoir: 5,
    reservoirRefreshAmount: 5,
    reservoirRefreshInterval: 1_000,
  });

  limiter.on('error', (err) => {
    logger.error({ err, event: 'limiter.error', provider }, 'Bottleneck limiter error');
  });

  limiter.on('depleted', (empty) => {
    logger.warn({ event: 'limiter.depleted', provider, empty }, 'Bottleneck reservoir depleted');
  });

  limiter.on('failed', (err, jobInfo) => {
    logger.warn(
      { err, event: 'limiter.failed', provider, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount },
      'Bottleneck job failed',
    );
    return undefined;
  });

  limiter.on('retry', (err, jobInfo) => {
    logger.warn(
      { err, event: 'limiter.retry', provider, jobId: jobInfo.options.id, retryCount: jobInfo.retryCount },
      'Bottleneck job retrying',
    );
  });

  return limiter;
}

export const binanceLimiter = makeFeedLimiter('binance');
export const coinbaseLimiter = makeFeedLimiter('coinbase');
