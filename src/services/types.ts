import { ComparisonResult } from '../modules/comparison-engine/types';

export interface IComparisonRunner {
  runManualComparison: (teamIds?: string[], channelIds?: string[]) => Promise<ComparisonResult[]>;
}
