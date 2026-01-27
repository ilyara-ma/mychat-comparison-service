import ComparisonEngine from '../modules/comparison-engine/comparison-engine';
import { ComparisonResult } from '../modules/comparison-engine/types';
import MetricsEmitter from '../modules/metrics-alerting/metrics-emitter';
import TeamDiscoveryService from '../modules/team-discovery/team-discovery-service';
import {
  FetchResult, IAlerts, ILogger, ModuleParams, SchedulerConfig, TimeWindow,
} from '../types';
import { calculateTimeWindow } from '../utils/time-window';
import DualRealtimeCommunicator from './dual-realtime-communicator';
import { IComparisonScheduler } from './types';

class ComparisonScheduler implements IComparisonScheduler {
  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private services: ModuleParams['services'];

  private teamDiscoveryService: TeamDiscoveryService;

  private dualRealtimeCommunicator: DualRealtimeCommunicator;

  private comparisonEngine: ComparisonEngine;

  private metricsEmitter: MetricsEmitter;

  private comparisonInterval: NodeJS.Timeout | null;

  private isRunning: boolean;

  private schedulerConfig: SchedulerConfig;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('comparison-scheduler');
    this.alerts = services.alerts;
    this.comparisonInterval = null;
    this.isRunning = false;
    this.schedulerConfig = {} as SchedulerConfig;

    this.teamDiscoveryService = new TeamDiscoveryService(params);
    this.dualRealtimeCommunicator = new DualRealtimeCommunicator(params);
    this.comparisonEngine = new ComparisonEngine(params);
    this.metricsEmitter = new MetricsEmitter(params);
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Comparison Scheduler');

    await this.teamDiscoveryService.initialize();
    await this.dualRealtimeCommunicator.init();

    this._loadSchedulerConfig();

    this.logger.info('Comparison Scheduler initialized successfully', {
      config: this.schedulerConfig,
    });
  }

  public async postInit(): Promise<void> {
    if (this.schedulerConfig.enabled) {
      await this.start();
    } else {
      this.logger.info('Comparison Scheduler is disabled');
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

    this.logger.info('Starting Comparison Scheduler');
    this.isRunning = true;

    this.comparisonInterval = setInterval(
      () => this._runComparison(),
      this.schedulerConfig.pollingIntervalMinutes * 60 * 1000,
    );

    await this._runComparison();

    this.logger.info('Comparison Scheduler started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Comparison Scheduler');

    if (this.comparisonInterval) {
      clearInterval(this.comparisonInterval);
      this.comparisonInterval = null;
    }

    this.isRunning = false;
    this.logger.info('Comparison Scheduler stopped');
  }

  public async runManualComparison(teamIds?: string[], channelIds?: string[]): Promise<ComparisonResult[]> {
    const timeWindow = calculateTimeWindow(
      this.schedulerConfig.pollingIntervalMinutes,
      5000,
    );

    if (channelIds && channelIds.length > 0) {
      this.logger.info('Running manual comparison for specified channels', { channelIds, channelCount: channelIds.length });
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

    let teams: Array<{ teamId: string; channelId: string }>;

    if (teamIds && teamIds.length > 0) {
      teams = await this.teamDiscoveryService.getTeamsByIds(teamIds);
      this.logger.info('Running manual comparison for specified teams', { teamIds, teamCount: teams.length });
    } else {
      teams = this.teamDiscoveryService.getCachedTeams();
      this.logger.info('Running manual comparison for all cached teams', { teamCount: teams.length });
    }

    if (teams.length === 0) {
      throw new Error('No teams found for manual comparison');
    }

    const comparisonResults: ComparisonResult[] = [];

    for (const team of teams) {
      const fetchResult = await this._fetchMessages(team.channelId, timeWindow);
      const comparisonResult = await this._compareTeam(fetchResult);
      if (comparisonResult) {
        comparisonResults.push(comparisonResult);
      }
    }

    return comparisonResults;
  }

  private _loadSchedulerConfig(): void {
    const cfg = (this.config.comparisonScheduler as Record<string, unknown>)?.comparisonScheduler as Record<string, unknown> || {};

    this.schedulerConfig = {
      enabled: cfg?.enabled !== false,
      pollingIntervalMinutes: (cfg?.pollingIntervalMinutes as number) || 15,
      pollingTimeWindowMinutes: (cfg?.pollingTimeWindowMinutes as number) || 20,
      batchSize: (cfg?.batchSize as number) || 50,
      maxMessagesPerFetch: (cfg?.maxMessagesPerFetch as number) || 100,
    };

    this.logger.info('Loaded scheduler configuration', this.schedulerConfig);
  }

  private async _runComparison(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();

    try {
      this.logger.info('Starting scheduled comparison run');

      const teams = this.teamDiscoveryService.getCachedTeams();

      if (teams.length === 0) {
        this.logger.warn('No teams to compare');
        return;
      }

      const timeWindow = calculateTimeWindow(
        this.schedulerConfig.pollingIntervalMinutes,
        5,
      );

      this.logger.info('Fetching messages for teams', {
        teamCount: teams.length,
        timeWindow,
      });

      const comparisonResults: ComparisonResult[] = [];

      for (const team of teams) {
        const fetchResult = await this._fetchMessages(team.channelId, timeWindow);
        const comparisonResult = await this._compareTeam(fetchResult);
        if (comparisonResult) {
          comparisonResults.push(comparisonResult);
        }
      }

      this.metricsEmitter.emitBatchSummary(comparisonResults);

      const duration = Date.now() - startTime;
      this.alerts.gauge('chat_comparison.comparison_run_duration_ms', {}, duration);

      this.logger.info('Scheduled comparison run completed', {
        teamCount: teams.length,
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

  private async _fetchMessages(channelId: string, timeWindow: TimeWindow): Promise<FetchResult> {
    const { fromTimestamp, toTimestamp } = timeWindow;
    const teamId = channelId;

    try {
      this.logger.info('Fetching messages for channel', {
        channelId,
        fromTimestamp,
        toTimestamp,
      });

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
