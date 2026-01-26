import { IAlerts, ILogger, ModuleParams } from '../../types';
import ContentComparator from './content-comparator';
import MetricsCalculator from './metrics-calculator';
import OrderingValidator from './ordering-validator';
import {
  ComparisonResult,
  FetchResult,
  MatchResult,
} from './types';

class ComparisonEngine {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private messageMatcher: { matchMessages: (p: unknown[], c: unknown[]) => MatchResult } | null;

  private contentComparator: ContentComparator | null;

  private orderingValidator: OrderingValidator | null;

  private metricsCalculator: MetricsCalculator | null;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('comparison-engine');
    this.alerts = services.alerts;
    this.messageMatcher = null;
    this.contentComparator = null;
    this.orderingValidator = null;
    this.metricsCalculator = null;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Comparison Engine');

    this.messageMatcher = this.services.messageMatcher as { matchMessages: (p: unknown[], c: unknown[]) => MatchResult };
    this.contentComparator = new ContentComparator(this.logger);
    this.orderingValidator = new OrderingValidator(this.logger);
    this.metricsCalculator = new MetricsCalculator(this.logger);

    this.logger.info('Comparison Engine initialized successfully');
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

  public async compare(fetchResult: FetchResult): Promise<ComparisonResult> {
    const {
      teamId, channelId, pubnubMessages, chatServiceMessages, pubnubSuccess, chatServiceSuccess,
    } = fetchResult;

    this.logger.info('Starting comparison', {
      teamId,
      channelId,
      pubnubMessageCount: pubnubMessages.length,
      chatServiceMessageCount: chatServiceMessages.length,
    });

    if (!pubnubSuccess || !chatServiceSuccess) {
      this.logger.warn('Skipping comparison due to fetch failures', {
        teamId,
        channelId,
        pubnubSuccess,
        chatServiceSuccess,
      });
      return this._createSkippedResult(teamId, channelId, pubnubSuccess, chatServiceSuccess);
    }

    const { matched, pubnubOnly, chatServiceOnly } = this.messageMatcher!.matchMessages(
      pubnubMessages,
      chatServiceMessages,
    );

    const contentMismatches = this._findContentMismatches(matched);

    const orderingViolations = this.orderingValidator!.validate(matched);

    const latencyDiffs = this.metricsCalculator!.calculateLatencyDifferences(matched);

    const countDiff = this.metricsCalculator!.calculateMessageCountDiscrepancy(
      pubnubMessages.length,
      chatServiceMessages.length,
    );

    const coverage = this.metricsCalculator!.calculateCoverage(
      matched.length,
      pubnubMessages.length,
    );

    const contentMismatchRate = this.metricsCalculator!.calculateContentMismatchRate(
      contentMismatches.length,
      matched.length,
    );

    const result: ComparisonResult = {
      teamId,
      channelId,
      timestamp: Date.now(),
      metrics: {
        countDiff,
        contentMismatchRate: Math.round(contentMismatchRate * 100) / 100,
        orderingViolations: orderingViolations.length,
        coverage: Math.round(coverage * 100) / 100,
        avgLatencyDiff: latencyDiffs.avg,
        maxLatencyDiff: latencyDiffs.max,
        chatMissingCount: pubnubOnly.length,
        pubnubMissingCount: chatServiceOnly.length,
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
      if (!this.contentComparator!.areEqual(p.pubnubMsg, p.chatMsg)) {
        const comparison = this.contentComparator!.compareContent(p.pubnubMsg, p.chatMsg);
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
