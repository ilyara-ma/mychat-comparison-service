export type FetchResult = {
  teamId: string;
  channelId: string;
  pubnubMessages: unknown[];
  chatServiceMessages: unknown[];
  pubnubSuccess: boolean;
  chatServiceSuccess: boolean;
};

export type MessagePair = {
  pubnubMsg: unknown;
  chatMsg: unknown;
};

export type MatchResult = {
  matched: MessagePair[];
  pubnubOnly: unknown[];
  chatServiceOnly: unknown[];
};

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

export type ComparisonDetails = {
  totalPubnubMessages: number;
  totalChatServiceMessages: number;
  matchedCount: number;
  contentMismatchCount: number;
  orderingViolationCount: number;
};

export type ComparisonResult = {
  teamId: string;
  channelId: string;
  timestamp: number;
  metrics: ComparisonMetrics;
  details?: ComparisonDetails;
  contentMismatches?: unknown[];
  orderingViolations?: unknown[];
  skipped?: boolean;
  reason?: string;
};

export type ContentDifference = {
  path: string;
  type: 'type_mismatch' | 'value_mismatch' | 'missing_in_pubnub' | 'missing_in_chatservice';
  pubnub?: unknown;
  chatService?: unknown;
};

export type ContentComparisonResult = {
  equal: boolean;
  pubnubContent?: unknown;
  chatContent?: unknown;
  differences?: ContentDifference[];
};

export type LatencyMetrics = {
  avg: number;
  max: number;
  min: number;
  median: number;
  differences: number[];
};

export type OrderingViolation = {
  index: number;
  prevPubnubTimetoken: string;
  currPubnubTimetoken: string;
  prevChatOffset: number;
  currChatOffset: number;
  pubnubOrder: number;
  chatOrder: number;
};
