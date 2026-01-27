import ComparisonEngine from '../modules/comparison-engine/comparison-engine';
import { ComparisonResult } from '../modules/comparison-engine/types';
import MetricsEmitter from '../modules/metrics-alerting/metrics-emitter';
import TeamDiscoveryService from '../modules/team-discovery/team-discovery-service';
import {
  FetchResult, IAlerts, ILogger, ModuleParams, SchedulerConfig, TimeWindow,
} from '../types';
import ChannelIdBuilder from '../utils/channel-id-builder';
import { calculateTimeWindow } from '../utils/time-window';
import DualRealtimeCommunicator from './dual-realtime-communicator';
import { IComparisonScheduler } from './types';

class ComparisonScheduler implements IComparisonScheduler {
  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private teamDiscoveryService: TeamDiscoveryService;

  private dualRealtimeCommunicator: DualRealtimeCommunicator;

  private comparisonEngine: ComparisonEngine;

  private metricsEmitter: MetricsEmitter;

  private comparisonInterval: NodeJS.Timeout | null;

  private isRunning: boolean;

  private schedulerConfig: SchedulerConfig;

  private channelIdBuilder: ChannelIdBuilder;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('comparison-scheduler');
    this.alerts = services.alerts;
    this.comparisonInterval = null;
    this.isRunning = false;
    this.schedulerConfig = {} as SchedulerConfig;

    const teamDiscoveryConfig = (config?.teamDiscovery as Record<string, unknown>) || {} as Record<string, unknown>;

    const dualRealtimeConfig = (config?.dualRealtimeCommunicator as Record<string, unknown>) || {} as Record<string, unknown>;

    this.teamDiscoveryService = new TeamDiscoveryService({
      services,
      config: teamDiscoveryConfig,
    });
    this.dualRealtimeCommunicator = new DualRealtimeCommunicator({
      services,
      config: dualRealtimeConfig,
    });
    this.comparisonEngine = new ComparisonEngine(params);
    this.metricsEmitter = new MetricsEmitter(params);

    const channelPrefixes = (config?.channelPrefixes as string[]) || ['team_'];
    this.channelIdBuilder = new ChannelIdBuilder(channelPrefixes);
  }

  public async init(): Promise<void> {
    await this.teamDiscoveryService.initialize();
    await this.dualRealtimeCommunicator.init();
    this._loadSchedulerConfig();
  }

  public async postInit(): Promise<void> {
    if (this.schedulerConfig.enabled) {
      await this.start();
    }
  }

  public async destroy(): Promise<void> {
    await this.stop();
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Comparison Scheduler is already running');
      return;
    }

    this.isRunning = true;

    this.comparisonInterval = setInterval(
      () => this._runComparison(),
      this.schedulerConfig.pollingIntervalMinutes * 60 * 1000,
    );

    await this._runComparison();
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.comparisonInterval) {
      clearInterval(this.comparisonInterval);
      this.comparisonInterval = null;
    }

    this.isRunning = false;
  }

  public async runManualComparison(teamIds?: string[], channelIds?: string[]): Promise<ComparisonResult[]> {
    const channelIdsToCompare: string[] = [];

    if (channelIds && channelIds.length > 0) {
      channelIdsToCompare.push(...channelIds);
    }

    if (teamIds && teamIds.length > 0) {
      teamIds.forEach((teamId) => {
        const generatedChannels = this.channelIdBuilder.buildChannelIds(teamId);
        channelIdsToCompare.push(...generatedChannels);
      });
    }

    if (channelIdsToCompare.length === 0) {
      throw new Error('No channels or teams provided for comparison');
    }

    return this._runComparisonForChannels(channelIdsToCompare);
  }

  private _loadSchedulerConfig(): void {
    const cfg = (this.config.comparisonScheduler as Record<string, unknown>) || {};

    this.schedulerConfig = {
      enabled: cfg?.enabled !== false,
      pollingIntervalMinutes: (cfg?.pollingIntervalMinutes as number) || 15,
      pollingTimeWindowMinutes: (cfg?.pollingTimeWindowMinutes as number) || 20,
      batchSize: (cfg?.batchSize as number) || 50,
      maxMessagesPerFetch: (cfg?.maxMessagesPerFetch as number) || 100,
    };
  }

  private async _runComparison(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();

    try {
      const teamIds = await this.teamDiscoveryService.getTeamsBatch();

      if (teamIds.length === 0) {
        this.logger.warn('No teams to compare');
        return;
      }

      const channelIds: string[] = [];
      teamIds.forEach((teamId) => {
        const generatedChannels = this.channelIdBuilder.buildChannelIds(teamId);
        channelIds.push(...generatedChannels);
      });

      const comparisonResults = await this._runComparisonForChannels(channelIds);

      this.metricsEmitter.emitBatchSummary(comparisonResults);

      const duration = Date.now() - startTime;
      this.alerts.gauge('chat_comparison.comparison_run_duration_ms', {}, duration);

      this.logger.info('Scheduled comparison run completed', {
        teamCount: teamIds.length,
        channelCount: channelIds.length,
        comparisonCount: comparisonResults.length,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error('Scheduled comparison run failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      this.alerts.counter('chat_comparison.scheduled_comparison_failures', {});
    }
  }

  private async _runComparisonForChannels(channelIds: string[]): Promise<ComparisonResult[]> {
    const timeWindow = calculateTimeWindow(
      this.schedulerConfig.pollingIntervalMinutes,
      5,
    );

    const comparisonResults: ComparisonResult[] = [];

    for (const channelId of channelIds) {
      const fetchResult = await this._fetchMessages(channelId, timeWindow);
      const comparisonResult = await this._compareTeam(fetchResult);
      if (comparisonResult) {
        comparisonResults.push(comparisonResult);
      }
    }

    return comparisonResults;
  }

  private async _fetchMessages(channelId: string, timeWindow: TimeWindow): Promise<FetchResult> {
    const { fromTimestamp, toTimestamp } = timeWindow;
    const teamId = this.channelIdBuilder.extractTeamId(channelId);

    try {
      const result = await this.dualRealtimeCommunicator.fetchMessagesFromBothSystems(
        channelId,
        {
          includeMessageActions: true,
          fromTimestamp,
          toTimestamp,
        },
      );

      this.alerts.counter('chat_comparison.message_fetches', {
        teamId,
        pubnubSuccess: result.pubnubSuccess ? 'true' : 'false',
        chatServiceSuccess: result.chatServiceSuccess ? 'true' : 'false',
      });

      return {
        teamId,
        channelId,
        pubnubMessages: result.pubnubMessages as unknown[],
        chatServiceMessages: result.chatServiceMessages as unknown[],
        pubnubSuccess: result.pubnubSuccess,
        chatServiceSuccess: result.chatServiceSuccess,
        fetchTimestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch messages for channel', {
        channelId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      this.alerts.counter('chat_comparison.fetch_errors', { teamId });

      return {
        teamId,
        channelId,
        pubnubMessages: [],
        chatServiceMessages: [],
        pubnubSuccess: false,
        chatServiceSuccess: false,
        fetchTimestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  private async _compareTeam(fetchResult: FetchResult): Promise<ComparisonResult | null> {
    try {
      const comparisonResult = await this.comparisonEngine.compare(fetchResult);
      this.metricsEmitter.emitComparisonMetrics(comparisonResult);
      return comparisonResult;
    } catch (error) {
      const fr = fetchResult as Record<string, unknown>;
      this.logger.error('Comparison failed for team', {
        teamId: fr.teamId,
        channelId: fr.channelId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      this.alerts.counter('chat_comparison.comparison_failures', {
        teamId: fr.teamId,
      });
      return null;
    }
  }
}

export default ComparisonScheduler;
