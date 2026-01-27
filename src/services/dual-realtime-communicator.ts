import { IAlerts, ILogger, ModuleParams } from '../types';
import { IRealtimeCommunicationsService } from './types';

class DualRealtimeCommunicator {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private pubnubCommunicator: IRealtimeCommunicationsService | null;

  private chatServiceCommunicator: IRealtimeCommunicationsService | null;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('dual-realtime-communicator');
    this.alerts = services.alerts;
    this.pubnubCommunicator = null;
    this.chatServiceCommunicator = null;
  }

  public async init(): Promise<void> {
    const RealtimeCommunicationsService = require('@moonactive/moonactive-realtime-communications');
    const rtcConfig = (this.config.rtcService as Record<string, unknown>) || {};
    const rollout = (rtcConfig.rollout as Record<string, Record<string, unknown>>) || {};
    const pubnubConfig = rollout.pubnub || (rtcConfig.pubnub as Record<string, unknown>) || {};
    const chatServiceConfig = rollout.chatService || (rtcConfig.chatService as Record<string, unknown>) || {};

    this.pubnubCommunicator = new RealtimeCommunicationsService({
      services: this.services,
      config: {
        provider: 'pubnub',
        pubnub: pubnubConfig,
      },
    }) as IRealtimeCommunicationsService;

    this.chatServiceCommunicator = new RealtimeCommunicationsService({
      services: this.services,
      config: {
        provider: 'chatService',
        chatService: chatServiceConfig,
      },
    }) as IRealtimeCommunicationsService;

    await this.pubnubCommunicator.init();
    await this.chatServiceCommunicator.init();
  }

  public async fetchMessagesFromBothSystems(
    channel: string,
    options: Record<string, unknown> = {},
  ): Promise<{
    pubnubMessages: unknown[];
    chatServiceMessages: unknown[];
    pubnubSuccess: boolean;
    chatServiceSuccess: boolean;
  }> {
    const startTime = Date.now();

    const [pubnubResult, chatServiceResult] = await Promise.allSettled([
      this.pubnubCommunicator!.fetchAllMessages(channel, options),
      this.chatServiceCommunicator!.fetchAllMessages(channel, options),
    ]);

    const pubnubSuccess = pubnubResult.status === 'fulfilled' && pubnubResult.value.success;
    const chatServiceSuccess = chatServiceResult.status === 'fulfilled' && chatServiceResult.value.success;

    if (!pubnubSuccess) {
      this.logger.error('PubNub fetch failed', {
        channel,
        error: pubnubResult.status === 'rejected' ? pubnubResult.reason : pubnubResult.value?.status,
      });
      this.alerts.counter('chat_comparison.api_failures', { system: 'pubnub' });
    }

    if (!chatServiceSuccess) {
      this.logger.error('Chat Service fetch failed', {
        channel,
        error: chatServiceResult.status === 'rejected' ? chatServiceResult.reason : chatServiceResult.value?.status,
      });
      this.alerts.counter('chat_comparison.api_failures', { system: 'chatService' });
    }

    const duration = Date.now() - startTime;
    this.alerts.gauge('chat_comparison.fetch_duration_ms', { channel }, duration);

    return {
      pubnubMessages: pubnubSuccess ? (pubnubResult.value.value || []) as unknown[] : [],
      chatServiceMessages: chatServiceSuccess ? (chatServiceResult.value.value || []) as unknown[] : [],
      pubnubSuccess,
      chatServiceSuccess,
    };
  }
}

export default DualRealtimeCommunicator;
