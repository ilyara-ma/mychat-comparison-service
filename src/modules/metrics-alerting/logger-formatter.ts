import { ILogger } from '../../types';
import { ComparisonResult } from './types';

class LoggerFormatter {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  public formatComparisonResult(comparisonResult: ComparisonResult): Record<string, unknown> {
    const {
      teamId, channelId, timestamp, metrics, details, skipped,
    } = comparisonResult;

    if (skipped) {
      return {
        teamId,
        channelId,
        timestamp,
        skipped: true,
        reason: comparisonResult.reason,
      };
    }

    return {
      teamId,
      channelId,
      timestamp,
      metrics: {
        message_count_discrepancy: metrics.countDiff,
        content_mismatch_rate_percent: metrics.contentMismatchRate,
        ordering_violations: metrics.orderingViolations,
        coverage_percent: metrics.coverage,
        avg_latency_diff_ms: metrics.avgLatencyDiff,
        max_latency_diff_ms: metrics.maxLatencyDiff,
        chat_missing_messages: metrics.chatMissingCount,
        pubnub_missing_messages: metrics.pubnubMissingCount,
      },
      summary: {
        total_pubnub_messages: details?.totalPubnubMessages || 0,
        total_chatservice_messages: details?.totalChatServiceMessages || 0,
        matched_messages: details?.matchedCount || 0,
        content_mismatches: details?.contentMismatchCount || 0,
        ordering_violations: details?.orderingViolationCount || 0,
      },
    };
  }

  public logComparisonResult(comparisonResult: ComparisonResult): void {
    const formatted = this.formatComparisonResult(comparisonResult);

    if (formatted.skipped) {
      this.logger.warn('Comparison skipped', formatted);
      return;
    }

    const metrics = formatted.metrics as Record<string, number>;
    const hasIssues = metrics.content_mismatch_rate_percent > 0
      || metrics.ordering_violations > 0
      || metrics.pubnub_missing_messages > 0
      || metrics.chat_missing_messages > 5;

    if (hasIssues) {
      this.logger.warn('Comparison completed with issues', formatted);
    } else {
      this.logger.info('Comparison completed successfully', formatted);
    }
  }

  public logMismatchDetails(comparisonResult: ComparisonResult): void {
    const { contentMismatches, orderingViolations } = comparisonResult;

    if (contentMismatches && contentMismatches.length > 0) {
      this.logger.warn('Content mismatches detected', {
        teamId: comparisonResult.teamId,
        channelId: comparisonResult.channelId,
        count: contentMismatches.length,
        samples: contentMismatches.slice(0, 3),
      });
    }

    if (orderingViolations && orderingViolations.length > 0) {
      this.logger.warn('Ordering violations detected', {
        teamId: comparisonResult.teamId,
        channelId: comparisonResult.channelId,
        count: orderingViolations.length,
        samples: orderingViolations.slice(0, 3),
      });
    }
  }
}

export default LoggerFormatter;
