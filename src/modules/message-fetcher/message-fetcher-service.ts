import {
  FetchResult, IAlerts, ILogger, ModuleParams, Team, TimeWindow,
} from '../../types';
import BatchProcessor from './batch-processor';
import { IDualRealtimeCommunicator } from './types';

class MessageFetcherService {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private dualRealtimeCommunicator: IDualRealtimeCommunicator | null;

  private batchProcessor: BatchProcessor | null;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('message-fetcher');
    this.alerts = services.alerts;
    this.dualRealtimeCommunicator = null;
    this.batchProcessor = null;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Message Fetcher Service');

    this.dualRealtimeCommunicator = this.services.dualRealtimeCommunicator as IDualRealtimeCommunicator;

    const batchSize = (this.config.comparisonScheduler as Record<string, number>)?.batchSize || 50;
    this.batchProcessor = new BatchProcessor(this.logger, batchSize);

    this.logger.info('Message Fetcher Service initialized successfully');
  }

  public async postInit(): Promise<void> {
    // Empty implementation
  }

  public async deepHealth(): Promise<void> {
    // Empty implementation
  }

  public async destroy(): Promise<void> {
    // Empty implementation
  }

  public async fetchMessages(team: Team, timeWindow: TimeWindow): Promise<FetchResult> {
    const { channelId, teamId } = team;
    const { fromTimestamp, toTimestamp } = timeWindow;

    try {
      this.logger.info('Fetching messages for team', {
        teamId,
        channelId,
        fromTimestamp,
        toTimestamp,
      });

      const result = await this.dualRealtimeCommunicator!.fetchMessagesFromBothSystems(
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
      this.logger.error('Failed to fetch messages for team', {
        teamId,
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

  public async fetchMessagesByChannelId(channelId: string, timeWindow: TimeWindow): Promise<FetchResult> {
    const { fromTimestamp, toTimestamp } = timeWindow;
    const teamId = channelId;

    try {
      this.logger.info('Fetching messages for channel', {
        channelId,
        fromTimestamp,
        toTimestamp,
      });

      const result = await this.dualRealtimeCommunicator!.fetchMessagesFromBothSystems(
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

  public async fetchMessagesForTeams(teams: Team[], timeWindow: TimeWindow): Promise<FetchResult[]> {
    const processFn = (team: Team) => this.fetchMessages(team, timeWindow);

    const results = await this.batchProcessor!.processAllBatches(
      teams,
      processFn,
      (this.config.comparisonScheduler as Record<string, number>)?.batchSize || 50,
    );

    if (results.failed.length > 0) {
      this.logger.warn('Some teams failed to fetch messages', {
        failedCount: results.failed.length,
        successCount: results.successful.length,
      });
    }

    return results.successful;
  }

  public calculateTimeWindow(pollingIntervalMinutes: number, bufferMinutes: number): TimeWindow {
    const now = Date.now();
    const windowMinutes = pollingIntervalMinutes + (bufferMinutes || 5);
    const fromTimestamp = Math.floor((now - (windowMinutes * 60 * 1000)) / 1000);
    const toTimestamp = Math.floor(now / 1000);

    return { fromTimestamp, toTimestamp };
  }
}

export default MessageFetcherService;
