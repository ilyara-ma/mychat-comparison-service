import { expect } from 'chai';
import sinon from 'sinon';
import BatchProcessor from '../../../src/modules/message-fetcher/batch-processor';
import { ILogger } from '../../../src/types';

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let logger: ILogger;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    batchProcessor = new BatchProcessor(logger, 3);
  });

  describe('createBatches', () => {
    it('should create batches correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const batches = batchProcessor.createBatches(items, 3);

      expect(batches).to.have.lengthOf(3);
      expect(batches[0]).to.deep.equal([1, 2, 3]);
      expect(batches[1]).to.deep.equal([4, 5, 6]);
      expect(batches[2]).to.deep.equal([7]);
    });

    it('should use default batch size', () => {
      const processor = new BatchProcessor(logger, 2);
      const items = [1, 2, 3, 4];
      const batches = processor.createBatches(items);

      expect(batches).to.have.lengthOf(2);
      expect(batches[0]).to.deep.equal([1, 2]);
      expect(batches[1]).to.deep.equal([3, 4]);
    });

    it('should handle empty array', () => {
      const batches = batchProcessor.createBatches([]);

      expect(batches).to.be.an('array').that.is.empty;
    });

    it('should handle custom batch size', () => {
      const items = [1, 2, 3, 4, 5];
      const batches = batchProcessor.createBatches(items, 2);

      expect(batches).to.have.lengthOf(3);
      expect(batches[0]).to.deep.equal([1, 2]);
      expect(batches[1]).to.deep.equal([3, 4]);
      expect(batches[2]).to.deep.equal([5]);
    });
  });

  describe('processBatch', () => {
    it('should process batch successfully', async () => {
      const batch = [1, 2, 3];
      const processFn = async (item: number) => item * 2;

      const result = await batchProcessor.processBatch(batch, processFn);

      expect(result.successful).to.deep.equal([2, 4, 6]);
      expect(result.failed).to.be.an('array').that.is.empty;
    });

    it('should handle failures in batch', async () => {
      const batch = [1, 2, 3];
      const processFn = async (item: number) => {
        if (item === 2) {
          throw new Error('Processing failed');
        }
        return item * 2;
      };

      const result = await batchProcessor.processBatch(batch, processFn);

      expect(result.successful).to.deep.equal([2, 6]);
      expect(result.failed).to.have.lengthOf(1);
      expect(result.failed[0].item).to.equal(2);
    });

    it('should handle all failures', async () => {
      const batch = [1, 2, 3];
      const processFn = async () => {
        throw new Error('Always fails');
      };

      const result = await batchProcessor.processBatch(batch, processFn);

      expect(result.successful).to.be.an('array').that.is.empty;
      expect(result.failed).to.have.lengthOf(3);
    });
  });

  describe('processAllBatches', () => {
    it('should process all batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processFn = async (item: number) => item * 2;

      const result = await batchProcessor.processAllBatches(items, processFn, 2);

      expect(result.successful).to.deep.equal([2, 4, 6, 8, 10]);
      expect(result.failed).to.be.an('array').that.is.empty;
    });

    it('should handle failures across batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processFn = async (item: number) => {
        if (item === 2 || item === 4) {
          throw new Error('Processing failed');
        }
        return item * 2;
      };

      const result = await batchProcessor.processAllBatches(items, processFn, 2);

      expect(result.successful).to.deep.equal([2, 6, 10]);
      expect(result.failed).to.have.lengthOf(2);
    });

    it('should use default batch size', async () => {
      const items = [1, 2, 3];
      const processFn = async (item: number) => item * 2;

      const result = await batchProcessor.processAllBatches(items, processFn);

      expect(result.successful).to.deep.equal([2, 4, 6]);
    });
  });
});
