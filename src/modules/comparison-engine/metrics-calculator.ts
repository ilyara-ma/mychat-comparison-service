import { ComparisonMetrics, LatencyMetrics, MessagePair } from './types';

class MetricsCalculator {
  public calculateMetrics(
    matchedPairs: MessagePair[],
    pubnubOnlyCount: number,
    chatServiceOnlyCount: number,
    contentMismatchCount: number,
    pubnubTotalCount: number,
    chatServiceTotalCount: number,
  ): ComparisonMetrics {
    const latencyDiffs = this._calculateLatencyDifferences(matchedPairs);
    const countDiff = this._calculateMessageCountDiscrepancy(pubnubTotalCount, chatServiceTotalCount);
    const coverage = this._calculateCoverage(matchedPairs.length, pubnubTotalCount);
    const contentMismatchRate = this._calculateContentMismatchRate(contentMismatchCount, matchedPairs.length);

    return {
      countDiff,
      contentMismatchRate: Math.round(contentMismatchRate * 100) / 100,
      orderingViolations: 0,
      coverage: Math.round(coverage * 100) / 100,
      avgLatencyDiff: latencyDiffs.avg,
      maxLatencyDiff: latencyDiffs.max,
      chatMissingCount: pubnubOnlyCount,
      pubnubMissingCount: chatServiceOnlyCount,
    };
  }

  private _calculateLatencyDifferences(matchedPairs: MessagePair[]): LatencyMetrics {
    if (!matchedPairs || matchedPairs.length === 0) {
      return {
        avg: 0,
        max: 0,
        min: 0,
        median: 0,
        differences: [],
      };
    }

    const latencyDiffs: number[] = [];

    matchedPairs.forEach((pair) => {
      const pubnubTime = this._extractTimestamp(pair.pubnubMsg);
      const chatTime = this._extractTimestamp(pair.chatMsg);

      if (pubnubTime && chatTime) {
        const diff = Math.abs(pubnubTime - chatTime);
        latencyDiffs.push(diff);
      }
    });

    if (latencyDiffs.length === 0) {
      return {
        avg: 0,
        max: 0,
        min: 0,
        median: 0,
        differences: [],
      };
    }

    const sum = latencyDiffs.reduce((acc, val) => acc + val, 0);
    const avg = sum / latencyDiffs.length;
    const max = Math.max(...latencyDiffs);
    const min = Math.min(...latencyDiffs);

    const sorted = [...latencyDiffs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      avg: Math.round(avg),
      max,
      min,
      median,
      differences: latencyDiffs,
    };
  }

  private _calculateCoverage(matchedCount: number, pubnubTotalCount: number): number {
    if (pubnubTotalCount === 0) {
      return 100;
    }

    return (matchedCount / pubnubTotalCount) * 100;
  }

  private _calculateContentMismatchRate(contentMismatchCount: number, matchedCount: number): number {
    if (matchedCount === 0) {
      return 0;
    }

    return (contentMismatchCount / matchedCount) * 100;
  }

  private _calculateMessageCountDiscrepancy(pubnubCount: number, chatServiceCount: number): number {
    return Math.abs(pubnubCount - chatServiceCount);
  }

  private _extractTimestamp(message: unknown): number | null {
    if (!message) {
      return null;
    }

    const msg = message as Record<string, unknown>;

    if (msg.timetoken) {
      return parseInt(msg.timetoken as string, 10) / 10000;
    }

    if (msg.createdAt) {
      return msg.createdAt as number;
    }

    if ((msg.message as Record<string, unknown>)?.createdAt) {
      return (msg.message as Record<string, unknown>).createdAt as number;
    }

    return null;
  }
}

export default MetricsCalculator;
