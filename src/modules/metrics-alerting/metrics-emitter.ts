import { IMetricsEmitter } from '../../services/types';
import {
  IAlerts, ILogger, ModuleParams, ThresholdsConfig,
} from '../../types';
import AlertManager from './alert-manager';
import LoggerFormatter from './logger-formatter';
import { ComparisonResult } from './types';

class MetricsEmitter implements IMetricsEmitter {
  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private alertManager: AlertManager | null;

  private loggerFormatter: LoggerFormatter | null;

  private thresholds: Partial<ThresholdsConfig>;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('metrics-emitter');
    this.alerts = services.alerts;
    this.alertManager = null;
    this.loggerFormatter = null;
    this.thresholds = {};
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Metrics Emitter');

    this.thresholds = this._loadThresholds();

    this.alertManager = new AlertManager(this.logger, this.alerts, this.thresholds);
    this.loggerFormatter = new LoggerFormatter(this.logger);

    this.logger.info('Metrics Emitter initialized successfully', { thresholds: this.thresholds });
  }

  public async postInit(): Promise<void> {
    // Empty implementation
  }

  public async deepHealth(): Promise<void> {
    // Empty implementation
  }

  public async destroy(): Promise<void> {
    // Empty implementation
  }

  public emitComparisonMetrics(comparisonResult: ComparisonResult): void {
    if (!comparisonResult) {
      return;
    }

    const {
      teamId, channelId, metrics, skipped,
    } = comparisonResult;

    if (skipped) {
      this.logger.warn('Skipping metrics emission for skipped comparison', {
        teamId,
        channelId,
        reason: comparisonResult.reason,
      });
      return;
    }

    const dims = { teamId: String(teamId), channelId: String(channelId) };

    this.alerts.gauge('chat_comparison.message_count_discrepancy', dims, metrics.countDiff);
    this.alerts.gauge('chat_comparison.content_mismatch_rate', dims, metrics.contentMismatchRate);
    this.alerts.gauge('chat_comparison.ordering_violations', dims, metrics.orderingViolations);
    this.alerts.gauge('chat_comparison.coverage_percentage', dims, metrics.coverage);
    this.alerts.gauge('chat_comparison.latency_diff_ms', dims, metrics.avgLatencyDiff);
    this.alerts.gauge('chat_comparison.max_latency_diff_ms', dims, metrics.maxLatencyDiff);

    if (metrics.chatMissingCount > 0) {
      this.alerts.counter('chat_comparison.chat_missing_messages', dims, metrics.chatMissingCount);
    }

    if (metrics.pubnubMissingCount > 0) {
      this.alerts.counter('chat_comparison.pubnub_missing_messages', dims, metrics.pubnubMissingCount);
    }

    this.loggerFormatter!.logComparisonResult(comparisonResult);
    this.loggerFormatter!.logMismatchDetails(comparisonResult);

    const alertsTriggered = this.alertManager!.checkThresholds(comparisonResult);
    if (alertsTriggered.length > 0) {
      this.alertManager!.emitAlerts(alertsTriggered);
    }
  }

  public emitBatchSummary(results: ComparisonResult[]): void {
    const totalComparisons = results.length;
    const skippedComparisons = results.filter((r) => r.skipped).length;
    const successfulComparisons = totalComparisons - skippedComparisons;

    const totalIssues = results.reduce((sum, r) => {
      if (r.skipped) return sum;
      const hasIssues = r.metrics.pubnubMissingCount > 0
        || r.metrics.chatMissingCount > 5
        || r.metrics.contentMismatchRate > 1
        || r.metrics.orderingViolations > 0;
      return hasIssues ? sum + 1 : sum;
    }, 0);

    this.alerts.gauge('chat_comparison.batch_total_comparisons', {}, totalComparisons);
    this.alerts.gauge('chat_comparison.batch_successful_comparisons', {}, successfulComparisons);
    this.alerts.gauge('chat_comparison.batch_skipped_comparisons', {}, skippedComparisons);
    this.alerts.gauge('chat_comparison.batch_comparisons_with_issues', {}, totalIssues);

    this.logger.info('Batch comparison summary', {
      totalComparisons,
      successfulComparisons,
      skippedComparisons,
      comparisonsWithIssues: totalIssues,
    });
  }

  private _loadThresholds(): Partial<ThresholdsConfig> {
    const config = (this.config.comparisonThresholds as Record<string, number>) || {};

    const thresholds = {
      messageCountDiscrepancyPercent: config.messageCountDiscrepancyPercent || 5,
      messageCountDiscrepancyAbsolute: config.messageCountDiscrepancyAbsolute || 10,
      contentMismatchRatePercent: config.contentMismatchRatePercent || 1,
      orderingViolationsCount: config.orderingViolationsCount || 0,
      coveragePercentageMin: config.coveragePercentageMin || 90,
      latencyDiffMsMax: config.latencyDiffMsMax || 5000,
      apiFailureRatePercent: config.apiFailureRatePercent || 5,
    };

    this.logger.info('Loaded thresholds configuration', thresholds);
    return thresholds;
  }
}

export default MetricsEmitter;
