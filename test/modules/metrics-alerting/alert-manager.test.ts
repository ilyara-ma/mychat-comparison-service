import { expect } from 'chai';
import sinon from 'sinon';
import AlertManager from '../../../src/modules/metrics-alerting/alert-manager';
import { IAlerts, ILogger, ThresholdsConfig } from '../../../src/types';
import { ComparisonResult } from '../../../src/modules/metrics-alerting/types';

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let logger: ILogger;
  let alerts: IAlerts;
  let thresholds: Partial<ThresholdsConfig>;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    alerts = {
      counter: sinon.stub(),
      gauge: sinon.stub(),
      histogram: sinon.stub(),
    };

    thresholds = {
      coveragePercentageMin: 90,
      contentMismatchRatePercent: 1,
      orderingViolationsCount: 0,
      latencyDiffMsMax: 5000,
    };

    alertManager = new AlertManager(logger, alerts, thresholds);
  });

  it('should handle null thresholds', () => {
    const manager = new AlertManager(logger, alerts, null as unknown as Partial<ThresholdsConfig>);
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

    const result = manager.checkThresholds(comparisonResult);

    expect(result).to.be.an('array');
  });

  describe('checkThresholds', () => {
    it('should create CRITICAL alert for pubnub missing messages', () => {
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
          pubnubMissingCount: 1,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('CRITICAL');
      expect(result[0].metric).to.equal('pubnub_missing_messages');
    });

    it('should create CRITICAL alert for both systems failed', () => {
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
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('CRITICAL');
      expect(result[0].metric).to.equal('api_failures');
    });

    it('should create CRITICAL alert for coverage below 50%', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 40,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('CRITICAL');
      expect(result[0].metric).to.equal('coverage_percentage');
    });

    it('should create WARNING alert for coverage below threshold', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 85,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('WARNING');
      expect(result[0].metric).to.equal('coverage_percentage');
    });

    it('should create WARNING alert for content mismatch rate above threshold', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 2.5,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('WARNING');
      expect(result[0].metric).to.equal('content_mismatch_rate');
    });

    it('should create WARNING alert for ordering violations', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 1,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('WARNING');
      expect(result[0].metric).to.equal('ordering_violations');
    });

    it('should create WARNING alert for chat missing messages above threshold', () => {
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
          chatMissingCount: 10,
          pubnubMissingCount: 0,
        },
        details: {
          totalPubnubMessages: 100,
          totalChatServiceMessages: 90,
          matchedCount: 90,
          contentMismatchCount: 0,
          orderingViolationCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('WARNING');
      expect(result[0].metric).to.equal('chat_missing_messages');
    });

    it('should create WARNING alert for high latency difference', () => {
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 3000,
          maxLatencyDiff: 6000,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].level).to.equal('WARNING');
      expect(result[0].metric).to.equal('latency_diff_ms');
    });

    it('should return empty array when no thresholds violated', () => {
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

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should use default threshold when coveragePercentageMin is not set', () => {
      const manager = new AlertManager(logger, alerts, {});
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coverage: 85,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = manager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].metric).to.equal('coverage_percentage');
    });

    it('should use default threshold when contentMismatchRatePercent is not set', () => {
      const manager = new AlertManager(logger, alerts, {});
      const comparisonResult: ComparisonResult = {
        teamId: 'team1',
        channelId: 'ch1',
        timestamp: 1000,
        metrics: {
          countDiff: 0,
          contentMismatchRate: 2,
          orderingViolations: 0,
          coverage: 100,
          avgLatencyDiff: 0,
          maxLatencyDiff: 0,
          chatMissingCount: 0,
          pubnubMissingCount: 0,
        },
      };

      const result = manager.checkThresholds(comparisonResult);

      expect(result).to.have.lengthOf(1);
      expect(result[0].metric).to.equal('content_mismatch_rate');
    });

    it('should handle chat missing messages below threshold', () => {
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
          chatMissingCount: 2,
          pubnubMissingCount: 0,
        },
        details: {
          totalPubnubMessages: 100,
          totalChatServiceMessages: 98,
          matchedCount: 98,
          contentMismatchCount: 0,
          orderingViolationCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle chat missing messages with no details', () => {
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
          chatMissingCount: 10,
          pubnubMissingCount: 0,
        },
      };

      const result = alertManager.checkThresholds(comparisonResult);

      expect(result).to.be.an('array');
    });
  });

  describe('emitAlerts', () => {
    it('should emit alerts and log CRITICAL as error', () => {
      const alertsList = [
        {
          level: 'CRITICAL' as const,
          metric: 'pubnub_missing_messages',
          value: 1,
          message: 'Test',
          teamId: 'team1',
          channelId: 'ch1',
        },
      ];

      alertManager.emitAlerts(alertsList);

      expect((alerts.counter as sinon.SinonStub).calledOnce).to.be.true;
      expect((logger.error as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should log WARNING as warn', () => {
      const alertsList = [
        {
          level: 'WARNING' as const,
          metric: 'content_mismatch_rate',
          value: 2,
          threshold: 1,
          message: 'Test',
          teamId: 'team1',
          channelId: 'ch1',
        },
      ];

      alertManager.emitAlerts(alertsList);

      expect((alerts.counter as sinon.SinonStub).calledOnce).to.be.true;
      expect((logger.warn as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should handle multiple alerts', () => {
      const alertsList = [
        {
          level: 'CRITICAL' as const,
          metric: 'pubnub_missing_messages',
          value: 1,
          message: 'Test 1',
          teamId: 'team1',
          channelId: 'ch1',
        },
        {
          level: 'WARNING' as const,
          metric: 'content_mismatch_rate',
          value: 2,
          threshold: 1,
          message: 'Test 2',
          teamId: 'team1',
          channelId: 'ch1',
        },
      ];

      alertManager.emitAlerts(alertsList);

      expect((alerts.counter as sinon.SinonStub).callCount).to.equal(2);
      expect((logger.error as sinon.SinonStub).calledOnce).to.be.true;
      expect((logger.warn as sinon.SinonStub).calledOnce).to.be.true;
    });
  });
});
