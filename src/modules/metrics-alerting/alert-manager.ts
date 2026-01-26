import { IAlerts, ILogger, ThresholdsConfig } from '../../types';
import { Alert, ComparisonResult } from './types';

class AlertManager {
  private logger: ILogger;

  private alerts: IAlerts;

  private thresholds: Partial<ThresholdsConfig>;

  constructor(logger: ILogger, alerts: IAlerts, thresholds: Partial<ThresholdsConfig>) {
    this.logger = logger;
    this.alerts = alerts;
    this.thresholds = thresholds || {};
  }

  public checkThresholds(comparisonResult: ComparisonResult): Alert[] {
    const { teamId, channelId, metrics } = comparisonResult;
    const alerts: Alert[] = [];

    if (metrics.pubnubMissingCount > 0) {
      alerts.push({
        level: 'CRITICAL',
        metric: 'pubnub_missing_messages',
        value: metrics.pubnubMissingCount,
        message: 'Messages found in Chat but not in PubNub (should never happen)',
        teamId,
        channelId,
      });
    }

    if (comparisonResult.skipped && comparisonResult.reason === 'both_systems_failed') {
      alerts.push({
        level: 'CRITICAL',
        metric: 'api_failures',
        message: 'Both PubNub and ChatService APIs failed',
        teamId,
        channelId,
      });
    }

    const coverageMin = this.thresholds.coveragePercentageMin || 90;
    if (metrics.coverage < 50) {
      alerts.push({
        level: 'CRITICAL',
        metric: 'coverage_percentage',
        value: metrics.coverage,
        threshold: coverageMin,
        message: `Coverage dropped below 50% (current: ${metrics.coverage.toFixed(2)}%)`,
        teamId,
        channelId,
      });
    } else if (metrics.coverage < coverageMin) {
      alerts.push({
        level: 'WARNING',
        metric: 'coverage_percentage',
        value: metrics.coverage,
        threshold: coverageMin,
        message: `Coverage below threshold (current: ${metrics.coverage.toFixed(2)}%, threshold: ${coverageMin}%)`,
        teamId,
        channelId,
      });
    }

    const contentMismatchThreshold = this.thresholds.contentMismatchRatePercent || 1;
    if (metrics.contentMismatchRate > contentMismatchThreshold) {
      alerts.push({
        level: 'WARNING',
        metric: 'content_mismatch_rate',
        value: metrics.contentMismatchRate,
        threshold: contentMismatchThreshold,
        message: `Content mismatch rate above threshold (${metrics.contentMismatchRate.toFixed(2)}% > ${contentMismatchThreshold}%)`,
        teamId,
        channelId,
      });
    }

    const orderingViolationsThreshold = this.thresholds.orderingViolationsCount || 0;
    if (metrics.orderingViolations > orderingViolationsThreshold) {
      alerts.push({
        level: 'WARNING',
        metric: 'ordering_violations',
        value: metrics.orderingViolations,
        threshold: orderingViolationsThreshold,
        message: `Ordering violations detected (${metrics.orderingViolations})`,
        teamId,
        channelId,
      });
    }

    const chatMissingThreshold = 5;
    if (metrics.chatMissingCount > 0) {
      const chatMissingPercent = (metrics.chatMissingCount
        / (metrics.chatMissingCount + (comparisonResult.details?.matchedCount || 1))) * 100;

      if (chatMissingPercent > chatMissingThreshold) {
        alerts.push({
          level: 'WARNING',
          metric: 'chat_missing_messages',
          value: metrics.chatMissingCount,
          percentage: chatMissingPercent,
          message: `Messages in PubNub but not Chat (${metrics.chatMissingCount} messages, ${chatMissingPercent.toFixed(2)}%)`,
          teamId,
          channelId,
        });
      }
    }

    const latencyThreshold = this.thresholds.latencyDiffMsMax || 5000;
    if (metrics.maxLatencyDiff > latencyThreshold) {
      alerts.push({
        level: 'WARNING',
        metric: 'latency_diff_ms',
        value: metrics.maxLatencyDiff,
        threshold: latencyThreshold,
        message: `High latency difference detected (max: ${metrics.maxLatencyDiff}ms, avg: ${metrics.avgLatencyDiff}ms)`,
        teamId,
        channelId,
      });
    }

    return alerts;
  }

  public emitAlerts(alerts: Alert[]): void {
    alerts.forEach((alert) => {
      this.alerts.counter('chat_comparison.threshold_violations', {
        level: alert.level,
        metric: alert.metric,
        teamId: alert.teamId,
      });

      const logMethod = alert.level === 'CRITICAL' ? 'error' : 'warn';
      this.logger[logMethod]('Threshold violation detected', alert as unknown as Record<string, unknown>);
    });
  }
}

export default AlertManager;
