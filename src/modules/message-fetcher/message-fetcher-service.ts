import { IMessageFetcherService } from '../../services/types';
import {
  FetchResult, IAlerts, ILogger, ModuleParams, TimeWindow,
} from '../../types';
import { IDualRealtimeCommunicator } from './types';

class MessageFetcherService implements IMessageFetcherService {
  private services: ModuleParams['services'];

  private logger: ILogger;

  private alerts: IAlerts;

  private dualRealtimeCommunicator: IDualRealtimeCommunicator | null;

  constructor(params: ModuleParams) {
    const { services } = params;
    this.services = services;
    this.logger = services.loggerManager.getLogger('message-fetcher');
    this.alerts = services.alerts;
    this.dualRealtimeCommunicator = null;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Message Fetcher Service');
    this.dualRealtimeCommunicator = this.services.dualRealtimeCommunicator as IDualRealtimeCommunicator;
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

  public async fetchMessages(channelId: string, timeWindow: TimeWindow): Promise<FetchResult> {
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
}

export default MessageFetcherService;
