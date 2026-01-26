export interface IRealtimeCommunicationsService {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  fetchAllMessages: (
    channel: string,
    options: Record<string, unknown>
  ) => Promise<{
    success: boolean;
    value?: unknown[];
    status?: string;
  }>;
  fetchLastMessagesByCount: (
    count: number,
    channel: string,
    options: Record<string, unknown>
  ) => Promise<{
    success: boolean;
    value?: unknown[];
    status?: string;
  }>;
}

export interface ITeamDiscoveryService {
  refreshTeams: () => Promise<void>;
  getCachedTeams: () => Array<{ teamId: string; channelId: string }>;
  getCacheInfo: () => { teamCount: number; lastUpdate: number | null };
}

export interface IMessageFetcherService {
  fetchMessagesForTeams: (
    teams: Array<{ teamId: string; channelId: string }>,
    timeWindow: { fromTimestamp: number; toTimestamp: number }
  ) => Promise<unknown[]>;
  calculateTimeWindow: (
    pollingIntervalMinutes: number,
    bufferMinutes: number
  ) => { fromTimestamp: number; toTimestamp: number };
}

export interface IComparisonEngine {
  compare: (fetchResult: unknown) => Promise<unknown>;
}

export interface IMetricsEmitter {
  emitComparisonMetrics: (comparisonResult: unknown) => void;
  emitBatchSummary: (comparisonResults: unknown[]) => void;
}
