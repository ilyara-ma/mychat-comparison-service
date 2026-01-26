export interface IServices {
  loggerManager: {
    getLogger: (name: string) => ILogger;
  };
  alerts: IAlerts;
  featureConfig: {
    client: IFeatureConfigClient;
  };
  secretManager?: unknown;
  dualRealtimeCommunicator: unknown;
  teamDiscoveryService: unknown;
  messageFetcherService: unknown;
  messageMatcher: unknown;
  comparisonEngine: unknown;
  metricsEmitter: unknown;
  comparisonScheduler: unknown;
}

export interface ILogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}

export interface IAlerts {
  counter: (metric: string, tags?: Record<string, unknown>, value?: number) => void;
  gauge: (metric: string, tags: Record<string, unknown>, value: number) => void;
  histogram: (metric: string, tags: Record<string, unknown>, value: number) => void;
}

export interface IFeatureConfigClient {
  getValue: <T>(
    key: string,
    userId: string,
    context: Record<string, unknown>,
    defaultValue: T
  ) => Promise<T>;
}

export type ModuleParams = {
  services: IServices;
  config?: Record<string, unknown>;
};

export type Team = {
  teamId: string;
  channelId: string;
};

export type TimeWindow = {
  fromTimestamp: number;
  toTimestamp: number;
};

export type Message = {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
  timetoken?: string;
  [key: string]: unknown;
};

export type FetchResult = {
  teamId: string;
  channelId: string;
  pubnubMessages: unknown[];
  chatServiceMessages: unknown[];
  pubnubSuccess: boolean;
  chatServiceSuccess: boolean;
  fetchTimestamp: number;
  error?: string;
};

export type ComparisonResult = {
  teamId: string;
  channelId: string;
  timestamp: number;
  messageCountDiscrepancy: number;
  contentMismatchRate: number;
  orderingViolations: number;
  coveragePercentage: number;
  latencyDiffMs: number;
  chatMissingMessages: number;
  pubnubMissingMessages: number;
  totalPubnubMessages: number;
  totalChatServiceMessages: number;
};

export type SchedulerConfig = {
  enabled: boolean;
  teamDiscoveryIntervalMinutes: number;
  pollingIntervalMinutes: number;
  pollingTimeWindowMinutes: number;
  batchSize: number;
  maxMessagesPerFetch: number;
};

export type ThresholdsConfig = {
  messageCountDiscrepancyPercent: number;
  messageCountDiscrepancyAbsolute: number;
  contentMismatchRatePercent: number;
  orderingViolationsCount: number;
  coveragePercentageMin: number;
  latencyDiffMsMax: number;
  apiFailureRatePercent: number;
};
