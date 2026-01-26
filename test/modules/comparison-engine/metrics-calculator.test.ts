import { expect } from 'chai';
import sinon from 'sinon';
import MetricsCalculator from '../../../src/modules/comparison-engine/metrics-calculator';
import { ILogger } from '../../../src/types';
import { MessagePair } from '../../../src/modules/comparison-engine/types';

describe('MetricsCalculator', () => {
  let metricsCalculator: MetricsCalculator;
  let logger: ILogger;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    metricsCalculator = new MetricsCalculator(logger);
  });

  describe('calculateLatencyDifferences', () => {
    it('should return zeros for empty matched pairs', () => {
      const result = metricsCalculator.calculateLatencyDifferences([]);

      expect(result).to.deep.equal({
        avg: 0,
        max: 0,
        min: 0,
        median: 0,
        differences: [],
      });
    });

    it('should return zeros for null matched pairs', () => {
      const result = metricsCalculator.calculateLatencyDifferences(null as unknown as MessagePair[]);

      expect(result).to.deep.equal({
        avg: 0,
        max: 0,
        min: 0,
        median: 0,
        differences: [],
      });
    });

    it('should calculate latency differences correctly', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '16094592000000000' },
          chatMsg: { createdAt: 1609459201000 },
        },
        {
          pubnubMsg: { timetoken: '16094592010000000' },
          chatMsg: { createdAt: 1609459202000 },
        },
      ];

      const result = metricsCalculator.calculateLatencyDifferences(matchedPairs);

      expect(result.avg).to.be.greaterThan(0);
      expect(result.max).to.be.greaterThan(0);
      expect(result.min).to.be.greaterThan(0);
      expect(result.median).to.be.greaterThan(0);
      expect(result.differences).to.have.lengthOf(2);
    });

    it('should handle messages without timestamps', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: {},
          chatMsg: {},
        },
      ];

      const result = metricsCalculator.calculateLatencyDifferences(matchedPairs);

      expect(result).to.deep.equal({
        avg: 0,
        max: 0,
        min: 0,
        median: 0,
        differences: [],
      });
    });

    it('should extract timestamp from message.createdAt', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { createdAt: 1000 },
          chatMsg: { createdAt: 2000 },
        },
      ];

      const result = metricsCalculator.calculateLatencyDifferences(matchedPairs);

      expect(result.differences).to.have.lengthOf(1);
      expect(result.differences[0]).to.equal(1000);
    });

    it('should extract timestamp from nested message.createdAt', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { message: { createdAt: 1000 } },
          chatMsg: { message: { createdAt: 2000 } },
        },
      ];

      const result = metricsCalculator.calculateLatencyDifferences(matchedPairs);

      expect(result.differences).to.have.lengthOf(1);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 100 when pubnubTotalCount is 0', () => {
      const result = metricsCalculator.calculateCoverage(0, 0);

      expect(result).to.equal(100);
    });

    it('should calculate coverage correctly', () => {
      const result = metricsCalculator.calculateCoverage(80, 100);

      expect(result).to.equal(80);
    });

    it('should handle zero matched count', () => {
      const result = metricsCalculator.calculateCoverage(0, 100);

      expect(result).to.equal(0);
    });
  });

  describe('calculateContentMismatchRate', () => {
    it('should return 0 when matchedCount is 0', () => {
      const result = metricsCalculator.calculateContentMismatchRate(5, 0);

      expect(result).to.equal(0);
    });

    it('should calculate mismatch rate correctly', () => {
      const result = metricsCalculator.calculateContentMismatchRate(5, 100);

      expect(result).to.equal(5);
    });

    it('should handle zero mismatches', () => {
      const result = metricsCalculator.calculateContentMismatchRate(0, 100);

      expect(result).to.equal(0);
    });
  });

  describe('calculateMessageCountDiscrepancy', () => {
    it('should calculate absolute difference', () => {
      const result = metricsCalculator.calculateMessageCountDiscrepancy(100, 80);

      expect(result).to.equal(20);
    });

    it('should handle reverse order', () => {
      const result = metricsCalculator.calculateMessageCountDiscrepancy(80, 100);

      expect(result).to.equal(20);
    });

    it('should return 0 for equal counts', () => {
      const result = metricsCalculator.calculateMessageCountDiscrepancy(100, 100);

      expect(result).to.equal(0);
    });
  });

  describe('calculateDiscrepancyPercentage', () => {
    it('should return 0 when both counts are 0', () => {
      const result = metricsCalculator.calculateDiscrepancyPercentage(0, 0);

      expect(result).to.equal(0);
    });

    it('should calculate percentage correctly', () => {
      const result = metricsCalculator.calculateDiscrepancyPercentage(100, 80);

      expect(result).to.equal(20);
    });

    it('should handle reverse order', () => {
      const result = metricsCalculator.calculateDiscrepancyPercentage(80, 100);

      expect(result).to.equal(20);
    });

    it('should return 0 for equal counts', () => {
      const result = metricsCalculator.calculateDiscrepancyPercentage(100, 100);

      expect(result).to.equal(0);
    });
  });
});
