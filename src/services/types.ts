import { ComparisonResult } from '../modules/comparison-engine/types';

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

export interface IComparisonScheduler {
  runManualComparison: (teamIds?: string[], channelIds?: string[]) => Promise<ComparisonResult[]>;
}
