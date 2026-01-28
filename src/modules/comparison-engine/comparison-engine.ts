import { ILogger, ModuleParams } from '../../types';
import MessageMatcher from '../message-matcher/message-matcher';
import ContentComparator from './content-comparator';
import MetricsCalculator from './metrics-calculator';
import OrderingValidator from './ordering-validator';
import {
  ComparisonResult,
  FetchResult,
} from './types';

class ComparisonEngine {
  private logger: ILogger;

  private messageMatcher: MessageMatcher;

  private contentComparator: ContentComparator;

  private orderingValidator: OrderingValidator;

  private metricsCalculator: MetricsCalculator;

  constructor(params: ModuleParams) {
    const { services } = params;
    this.logger = services.loggerManager.getLogger('comparison-engine');
    this.messageMatcher = new MessageMatcher();
    this.contentComparator = new ContentComparator();
    this.orderingValidator = new OrderingValidator();
    this.metricsCalculator = new MetricsCalculator();
  }

  public async compare(fetchResult: FetchResult): Promise<ComparisonResult> {
    const {
      teamId, channelId, pubnubMessages, chatServiceMessages, pubnubSuccess, chatServiceSuccess,
    } = fetchResult;

    if (!pubnubSuccess || !chatServiceSuccess) {
      this.logger.warn('Skipping comparison due to fetch failures', {
        teamId,
        channelId,
        pubnubSuccess,
        chatServiceSuccess,
      });
      return this._createSkippedResult(teamId, channelId, pubnubSuccess, chatServiceSuccess);
    }

    const pubnubCount = pubnubMessages.length;
    const chatCount = chatServiceMessages.length;

    if (pubnubCount === 0 || chatCount === 0) {
      if (pubnubCount === 0 && chatCount === 0) {
        this.logger.info('No activity detected in either system', { teamId, channelId });
      } else {
        this.logger.warn('Total discrepancy: one system is empty', {
          teamId,
          channelId,
          pubnubCount,
          chatCount,
        });
      }
      return this._handleEmptySetComparison(fetchResult);
    }

    const { matched, pubnubOnly, chatServiceOnly } = this.messageMatcher.matchMessages(
      pubnubMessages as Array<{ timetoken: string; [key: string]: unknown }>,
      chatServiceMessages as Array<{ [key: string]: unknown }>,
    );

    const contentMismatches = this._findContentMismatches(matched);

    const orderingViolations = this.orderingValidator.validate(matched);

    const metrics = this.metricsCalculator.calculateMetrics(
      matched,
      pubnubOnly.length,
      chatServiceOnly.length,
      contentMismatches.length,
      pubnubMessages.length,
      chatServiceMessages.length,
    );

    const result: ComparisonResult = {
      teamId,
      channelId,
      timestamp: Date.now(),
      metrics: {
        ...metrics,
        orderingViolations: orderingViolations.length,
      },
      details: {
        totalPubnubMessages: pubnubMessages.length,
        totalChatServiceMessages: chatServiceMessages.length,
        matchedCount: matched.length,
        contentMismatchCount: contentMismatches.length,
        orderingViolationCount: orderingViolations.length,
      },
      contentMismatches: contentMismatches.slice(0, 10),
      orderingViolations: orderingViolations.slice(0, 10),
    };

    this.logger.info('Comparison completed', {
      teamId,
      channelId,
      metrics: result.metrics,
    });

    return result;
  }

  private _findContentMismatches(matchedPairs: unknown[]): unknown[] {
    const mismatches: unknown[] = [];

    matchedPairs.forEach((pair, index) => {
      const p = pair as { pubnubMsg: unknown; chatMsg: unknown };
      const comparison = this.contentComparator.compareContent(p.pubnubMsg, p.chatMsg);

      if (!comparison.equal) {
        const pubnub = p.pubnubMsg as Record<string, unknown>;
        const chat = p.chatMsg as Record<string, unknown>;
        mismatches.push({
          index,
          pubnubTimetoken: pubnub.timetoken,
          chatMessageId: (chat.message as Record<string, unknown>)?.id || chat.id,
          differences: comparison.differences?.slice(0, 5) || [],
        });
      }
    });

    return mismatches;
  }

  private _handleEmptySetComparison(fetchResult: FetchResult): ComparisonResult {
    const {
      teamId, channelId, pubnubMessages, chatServiceMessages,
    } = fetchResult;

    const metrics = this.metricsCalculator.calculateMetrics(
      [],
      pubnubMessages.length,
      chatServiceMessages.length,
      0,
      pubnubMessages.length,
      chatServiceMessages.length,
    );

    return {
      teamId,
      channelId,
      timestamp: Date.now(),
      metrics: {
        ...metrics,
        orderingViolations: 0,
      },
      details: {
        totalPubnubMessages: pubnubMessages.length,
        totalChatServiceMessages: chatServiceMessages.length,
        matchedCount: 0,
        contentMismatchCount: 0,
        orderingViolationCount: 0,
      },
      contentMismatches: [],
      orderingViolations: [],
    };
  }

  private _createSkippedResult(
    teamId: string,
    channelId: string,
    pubnubSuccess: boolean,
    chatServiceSuccess: boolean,
  ): ComparisonResult {
    let reason: string;
    if (!pubnubSuccess && !chatServiceSuccess) {
      reason = 'both_systems_failed';
    } else if (!pubnubSuccess) {
      reason = 'pubnub_failed';
    } else {
      reason = 'chatservice_failed';
    }

    return {
      teamId,
      channelId,
      timestamp: Date.now(),
      skipped: true,
      reason,
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
  }
}

export default ComparisonEngine;
