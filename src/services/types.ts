import { ComparisonResult } from '../modules/comparison-engine/types';
import { FetchResult } from '../types';

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
  getCachedTeams: () => Array<{ teamId: string; channelId: string }>;
  getTeamsByIds: (teamIds: string[]) => Promise<Array<{ teamId: string; channelId: string }>>;
}

export interface IMessageFetcherService {
  fetchMessagesForTeams: (
    teams: Array<{ teamId: string; channelId: string }>,
    timeWindow: { fromTimestamp: number; toTimestamp: number }
  ) => Promise<FetchResult[]>;
  fetchMessagesByChannelId: (
    channelId: string,
    timeWindow: { fromTimestamp: number; toTimestamp: number }
  ) => Promise<FetchResult>;
  calculateTimeWindow: (
    pollingIntervalMinutes: number,
    bufferMinutes: number
  ) => { fromTimestamp: number; toTimestamp: number };
}

export interface IComparisonEngine {
  compare: (fetchResult: FetchResult) => Promise<ComparisonResult>;
}

export interface IMetricsEmitter {
  emitComparisonMetrics: (comparisonResult: ComparisonResult) => void;
  emitBatchSummary: (comparisonResults: ComparisonResult[]) => void;
}

export interface IComparisonScheduler {
  runManualComparison: (teamIds?: string[], channelIds?: string[]) => Promise<ComparisonResult[]>;
}
