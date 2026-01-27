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

  describe('calculateMetrics', () => {
    it('should calculate all metrics with empty matched pairs', () => {
      const metrics = metricsCalculator.calculateMetrics(
        [],
        5,
        3,
        0,
        100,
        95,
      );

      expect(metrics.countDiff).to.equal(5);
      expect(metrics.coverage).to.equal(0);
      expect(metrics.contentMismatchRate).to.equal(0);
      expect(metrics.avgLatencyDiff).to.equal(0);
      expect(metrics.maxLatencyDiff).to.equal(0);
      expect(metrics.chatMissingCount).to.equal(5);
      expect(metrics.pubnubMissingCount).to.equal(3);
    });

    it('should calculate all metrics with matched pairs', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '16094592000000000' },
          chatMsg: { createdAt: 1609459201000 },
        },
        {
          pubnubMsg: { timetoken: '16094592010000000' },
          chatMsg: { createdAt: 1609459203000 },
        },
      ];

      const metrics = metricsCalculator.calculateMetrics(
        matchedPairs,
        10,
        5,
        2,
        100,
        95,
      );

      expect(metrics.countDiff).to.equal(5);
      expect(metrics.coverage).to.equal(2);
      expect(metrics.contentMismatchRate).to.equal(100);
      expect(metrics.avgLatencyDiff).to.be.greaterThan(0);
      expect(metrics.maxLatencyDiff).to.be.greaterThan(0);
      expect(metrics.chatMissingCount).to.equal(10);
      expect(metrics.pubnubMissingCount).to.equal(5);
    });

    it('should handle perfect match scenario', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '16094592000000000' },
          chatMsg: { createdAt: 1609459200000 },
        },
        {
          pubnubMsg: { timetoken: '16094592010000000' },
          chatMsg: { createdAt: 1609459201000 },
        },
      ];

      const metrics = metricsCalculator.calculateMetrics(
        matchedPairs,
        0,
        0,
        0,
        2,
        2,
      );

      expect(metrics.countDiff).to.equal(0);
      expect(metrics.coverage).to.equal(100);
      expect(metrics.contentMismatchRate).to.equal(0);
      expect(metrics.chatMissingCount).to.equal(0);
      expect(metrics.pubnubMissingCount).to.equal(0);
    });

    it('should handle zero pubnub messages edge case', () => {
      const metrics = metricsCalculator.calculateMetrics(
        [],
        0,
        5,
        0,
        0,
        5,
      );

      expect(metrics.countDiff).to.equal(5);
      expect(metrics.coverage).to.equal(100);
      expect(metrics.contentMismatchRate).to.equal(0);
      expect(metrics.chatMissingCount).to.equal(0);
      expect(metrics.pubnubMissingCount).to.equal(5);
    });

    it('should round coverage and content mismatch rate to 2 decimal places', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '16094592000000000' },
          chatMsg: { createdAt: 1609459200000 },
        },
        {
          pubnubMsg: { timetoken: '16094592010000000' },
          chatMsg: { createdAt: 1609459201000 },
        },
        {
          pubnubMsg: { timetoken: '16094592020000000' },
          chatMsg: { createdAt: 1609459202000 },
        },
      ];

      const metrics = metricsCalculator.calculateMetrics(
        matchedPairs,
        0,
        0,
        1,
        300,
        300,
      );

      expect(metrics.coverage).to.be.a('number');
      expect(metrics.contentMismatchRate).to.be.a('number');
      expect(metrics.coverage.toString().split('.')[1]?.length || 0).to.be.lessThanOrEqual(2);
      expect(metrics.contentMismatchRate.toString().split('.')[1]?.length || 0).to.be.lessThanOrEqual(2);
    });

    it('should handle messages without timestamps gracefully', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: {},
          chatMsg: {},
        },
      ];

      const metrics = metricsCalculator.calculateMetrics(
        matchedPairs,
        0,
        0,
        0,
        1,
        1,
      );

      expect(metrics.avgLatencyDiff).to.equal(0);
      expect(metrics.maxLatencyDiff).to.equal(0);
    });

    it('should calculate realistic comparison scenario', () => {
      const matchedPairs: MessagePair[] = [];
      for (let i = 0; i < 95; i++) {
        matchedPairs.push({
          pubnubMsg: { timetoken: `${1609459200000 + i * 1000}0000000` },
          chatMsg: { createdAt: 1609459200000 + i * 1000 + 50 },
        });
      }

      const metrics = metricsCalculator.calculateMetrics(
        matchedPairs,
        5,
        2,
        3,
        100,
        97,
      );

      expect(metrics.countDiff).to.equal(3);
      expect(metrics.coverage).to.equal(95);
      expect(metrics.contentMismatchRate).to.equal(3.16);
      expect(metrics.chatMissingCount).to.equal(5);
      expect(metrics.pubnubMissingCount).to.equal(2);
      expect(metrics.avgLatencyDiff).to.be.greaterThan(0);
    });
  });
});
