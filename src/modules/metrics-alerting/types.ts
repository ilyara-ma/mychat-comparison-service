export type ComparisonMetrics = {
  countDiff: number;
  contentMismatchRate: number;
  orderingViolations: number;
  coverage: number;
  avgLatencyDiff: number;
  maxLatencyDiff: number;
  chatMissingCount: number;
  pubnubMissingCount: number;
};

export type ComparisonResult = {
  teamId: string;
  channelId: string;
  timestamp: number;
  metrics: ComparisonMetrics;
  skipped?: boolean;
  reason?: string;
  details?: {
    totalPubnubMessages: number;
    totalChatServiceMessages: number;
    matchedCount: number;
    contentMismatchCount: number;
    orderingViolationCount: number;
  };
  contentMismatches?: unknown[];
  orderingViolations?: unknown[];
};

export type Alert = {
  level: 'CRITICAL' | 'WARNING';
  metric: string;
  value?: number;
  threshold?: number;
  message: string;
  teamId: string;
  channelId: string;
  percentage?: number;
};
