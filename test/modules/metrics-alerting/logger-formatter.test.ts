import { expect } from 'chai';
import sinon from 'sinon';
import LoggerFormatter from '../../../src/modules/metrics-alerting/logger-formatter';
import { ILogger } from '../../../src/types';
import { ComparisonResult } from '../../../src/modules/metrics-alerting/types';

describe('LoggerFormatter', () => {
  let loggerFormatter: LoggerFormatter;
  let logger: ILogger;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    loggerFormatter = new LoggerFormatter(logger);
  });

  describe('formatComparisonResult', () => {
    it('should format skipped result', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        skipped: true,
        reason: 'both_systems_failed',
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 0,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = loggerFormatter.formatComparisonResult(comparisonResult);

      expect(result.skipped).to.be.true;
      expect(result.reason).to.equal('both_systems_failed');
      expect(result.metrics).to.be.undefined;
    });

    it('should format successful result', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 5,
          contentMismatchRate: 2.5,
          orderingViolations: 1,
          coverage: 95.5,
          avgLatencyDiff: 100,
          maxLatencyDiff: 200,
          chatMissingCount: 3,
          pubnubMissingCount: 0,
        },
        details: {
          totalPubnubMessages: 100,
          totalChatServiceMessages: 95,
          matchedCount: 95,
          contentMismatchCount: 2,
          orderingViolationCount: 1,
        },
      };

      const result = loggerFormatter.formatComparisonResult(comparisonResult);

      expect(result.skipped).to.be.undefined;
      expect(result.metrics).to.exist;
      expect((result.metrics as Record<string, number>).message_count_discrepancy).to.equal(5);
      expect((result.summary as Record<string, number>).total_pubnub_messages).to.equal(100);
    });

    it('should handle missing details', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = loggerFormatter.formatComparisonResult(comparisonResult);

      expect((result.summary as Record<string, number>).total_pubnub_messages).to.equal(0);
    });
  });

  describe('logComparisonResult', () => {
    it('should log skipped result as warning', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        skipped: true,
        reason: 'both_systems_failed',
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 0,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      loggerFormatter.logComparisonResult(comparisonResult);

      expect((logger.warn as sinon.SinonStub).calledOnce).to.be.true;
      expect((logger.info as sinon.SinonStub).called).to.be.false;
    });

    it('should log result with issues as warning', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 1.5,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      loggerFormatter.logComparisonResult(comparisonResult);

      expect((logger.warn as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should log successful result as info', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      loggerFormatter.logComparisonResult(comparisonResult);

      expect((logger.info as sinon.SinonStub).calledOnce).to.be.true;
      expect((logger.warn as sinon.SinonStub).called).to.be.false;
    });
  });

  describe('logMismatchDetails', () => {
    it('should log content mismatches', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
        contentMismatches: [
          { index: 0, pubnubTimetoken: '100' },
          { index: 1, pubnubTimetoken: '200' },
        ],
      };

      loggerFormatter.logMismatchDetails(comparisonResult);

      expect((logger.warn as sinon.SinonStub).callCount).to.equal(1);
    });

    it('should log ordering violations', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
        orderingViolations: [
          { index: 1, prevPubnubTimetoken: '100', currPubnubTimetoken: '200' },
        ],
      };

      loggerFormatter.logMismatchDetails(comparisonResult);

      expect((logger.warn as sinon.SinonStub).callCount).to.equal(1);
    });

    it('should not log when no mismatches', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      loggerFormatter.logMismatchDetails(comparisonResult);

      expect((logger.warn as sinon.SinonStub).called).to.be.false;
    });
  });
});
