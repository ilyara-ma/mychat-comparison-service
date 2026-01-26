import {
  IAlerts, IFeatureConfigClient, ILogger, ModuleParams, SchedulerConfig,
} from '../types';
import {
  IComparisonEngine, IMessageFetcherService, IMetricsEmitter, ITeamDiscoveryService,
} from './types';

class ComparisonScheduler {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private featureConfigClient: IFeatureConfigClient;

  private teamDiscoveryService: ITeamDiscoveryService | null;

  private messageFetcherService: IMessageFetcherService | null;

  private comparisonEngine: IComparisonEngine | null;

  private metricsEmitter: IMetricsEmitter | null;

  private teamDiscoveryInterval: NodeJS.Timeout | null;

  private comparisonInterval: NodeJS.Timeout | null;

  private isRunning: boolean;

  private schedulerConfig: SchedulerConfig;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('comparison-scheduler');
    this.alerts = services.alerts;
    this.featureConfigClient = services.featureConfig.client;
    this.teamDiscoveryService = null;
    this.messageFetcherService = null;
    this.comparisonEngine = null;
    this.metricsEmitter = null;
    this.teamDiscoveryInterval = null;
    this.comparisonInterval = null;
    this.isRunning = false;
    this.schedulerConfig = {} as SchedulerConfig;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Comparison Scheduler');

    this.teamDiscoveryService = this.services.teamDiscoveryService as ITeamDiscoveryService;
    this.messageFetcherService = this.services.messageFetcherService as IMessageFetcherService;
    this.comparisonEngine = this.services.comparisonEngine as IComparisonEngine;
    this.metricsEmitter = this.services.metricsEmitter as IMetricsEmitter;

    await this._loadSchedulerConfig();

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

  public async deepHealth(): Promise<void> {
    // Empty implementation
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

    await this.teamDiscoveryService!.refreshTeams();

    this.teamDiscoveryInterval = setInterval(
      () => this._runTeamDiscovery(),
      this.schedulerConfig.teamDiscoveryIntervalMinutes * 60 * 1000,
    );

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

    if (this.teamDiscoveryInterval) {
      clearInterval(this.teamDiscoveryInterval);
      this.teamDiscoveryInterval = null;
    }

    if (this.comparisonInterval) {
      clearInterval(this.comparisonInterval);
      this.comparisonInterval = null;
    }

    this.isRunning = false;
    this.logger.info('Comparison Scheduler stopped');
  }

  public async runManualComparison(teamIds?: string[]): Promise<unknown[]> {
    let teams = this.teamDiscoveryService!.getCachedTeams();

    if (teamIds && teamIds.length > 0) {
      teams = teams.filter((team) => teamIds.includes(team.teamId));
      this.logger.info('Running manual comparison for specified teams', { teamIds, teamCount: teams.length });
    } else {
      this.logger.info('Running manual comparison for all cached teams', { teamCount: teams.length });
    }

    if (teams.length === 0) {
      throw new Error('No teams found for manual comparison');
    }

    const timeWindow = this.messageFetcherService!.calculateTimeWindow(
      this.schedulerConfig.pollingIntervalMinutes,
      5,
    );

    const fetchResults = await this.messageFetcherService!.fetchMessagesForTeams(teams, timeWindow);
    const comparisonResults: unknown[] = [];

    for (const fetchResult of fetchResults) {
      const comparisonResult = await this._compareTeam(fetchResult);
      if (comparisonResult) {
        comparisonResults.push(comparisonResult);
      }
    }

    return comparisonResults;
  }

  private async _loadSchedulerConfig(): Promise<void> {
    try {
      const config = await this.featureConfigClient.getValue(
        'chat-comparison-config',
        '',
        {},
        (this.config.comparisonScheduler as Record<string, unknown>) || {},
      );

      const cfg = config as Record<string, unknown>;
      this.schedulerConfig = {
        enabled: cfg.enabled !== false,
        teamDiscoveryIntervalMinutes: (cfg.team_discovery_interval_minutes as number) || 30,
        pollingIntervalMinutes: (cfg.polling_interval_minutes as number) || 15,
        pollingTimeWindowMinutes: (cfg.polling_time_window_minutes as number) || 20,
        batchSize: (cfg.batch_size as number) || 50,
        maxMessagesPerFetch: (cfg.max_messages_per_fetch as number) || 100,
      };
    } catch (error) {
      this.logger.warn('Failed to load scheduler config from feature config, using defaults', {
        error: (error as Error).message,
      });

      const cfg = this.config.comparisonScheduler as Record<string, unknown>;
      this.schedulerConfig = {
        enabled: cfg?.enabled !== false,
        teamDiscoveryIntervalMinutes: (cfg?.teamDiscoveryIntervalMinutes as number) || 30,
        pollingIntervalMinutes: (cfg?.pollingIntervalMinutes as number) || 15,
        pollingTimeWindowMinutes: (cfg?.pollingTimeWindowMinutes as number) || 20,
        batchSize: (cfg?.batchSize as number) || 50,
        maxMessagesPerFetch: (cfg?.maxMessagesPerFetch as number) || 100,
      };
    }
  }

  private async _runTeamDiscovery(): Promise<void> {
    try {
      this.logger.info('Running scheduled team discovery');
      await this.teamDiscoveryService!.refreshTeams();
    } catch (error) {
      this.logger.error('Scheduled team discovery failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      this.alerts.counter('chat_comparison.scheduled_team_discovery_failures', {});
    }
  }

  private async _runComparison(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();

    try {
      this.logger.info('Starting scheduled comparison run');

      const teams = this.teamDiscoveryService!.getCachedTeams();

      if (teams.length === 0) {
        this.logger.warn('No teams to compare');
        return;
      }

      const timeWindow = this.messageFetcherService!.calculateTimeWindow(
        this.schedulerConfig.pollingIntervalMinutes,
        5,
      );

      this.logger.info('Fetching messages for teams', {
        teamCount: teams.length,
        timeWindow,
      });

      const fetchResults = await this.messageFetcherService!.fetchMessagesForTeams(teams, timeWindow);

      this.logger.info('Messages fetched, starting comparisons', {
        fetchResultCount: fetchResults.length,
      });

      const comparisonResults = await this._compareAllTeams(fetchResults);

      this.metricsEmitter!.emitBatchSummary(comparisonResults);

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

  private async _compareAllTeams(fetchResults: unknown[]): Promise<unknown[]> {
    const comparisonResults: unknown[] = [];

    for (const fetchResult of fetchResults) {
      const result = await this._compareTeam(fetchResult);
      if (result) {
        comparisonResults.push(result);
      }
    }

    return comparisonResults;
  }

  private async _compareTeam(fetchResult: unknown): Promise<unknown | null> {
    try {
      const comparisonResult = await this.comparisonEngine!.compare(fetchResult);
      this.metricsEmitter!.emitComparisonMetrics(comparisonResult);
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
