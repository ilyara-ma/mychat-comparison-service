import { ILogger } from '../../types';
import { BatchResult } from './types';

class BatchProcessor {
  private logger: ILogger;

  private batchSize: number;

  constructor(logger: ILogger, batchSize = 50) {
    this.logger = logger;
    this.batchSize = batchSize;
  }

  public createBatches<T>(items: T[], batchSize = this.batchSize): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  public async processBatch<T, R>(batch: T[], processFn: (item: T) => Promise<R>): Promise<BatchResult<R>> {
    const results = await Promise.allSettled(
      batch.map((item) => processFn(item)),
    );

    const successful: R[] = [];
    const failed: Array<{ item: unknown; error: unknown }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: batch[index],
          error: result.reason,
        });
      }
    });

    return { successful, failed };
  }

  public async processAllBatches<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    batchSize = this.batchSize,
  ): Promise<BatchResult<R>> {
    const batches = this.createBatches(items, batchSize);
    const allResults: BatchResult<R> = {
      successful: [],
      failed: [],
    };

    for (const batch of batches) {
      const batchResults = await this._processSingleBatch(batch, processFn);
      allResults.successful.push(...batchResults.successful);
      allResults.failed.push(...batchResults.failed);
    }

    return allResults;
  }

  private async _processSingleBatch<T, R>(
    batch: T[],
    processFn: (item: T) => Promise<R>,
  ): Promise<BatchResult<R>> {
    return this.processBatch(batch, processFn);
  }
}

export default BatchProcessor;
