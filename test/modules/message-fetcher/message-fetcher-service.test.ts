import { expect } from 'chai';
import sinon from 'sinon';
import MessageFetcherService from '../../../src/modules/message-fetcher/message-fetcher-service';
import { FetchResult, IAlerts, ILogger, ModuleParams } from '../../../src/types';
import { IDualRealtimeCommunicator } from '../../../src/modules/message-fetcher/types';

describe('MessageFetcherService', () => {
  let messageFetcherService: MessageFetcherService;
  let logger: ILogger;
  let alerts: IAlerts;
  let dualRealtimeCommunicator: IDualRealtimeCommunicator;
  let moduleParams: ModuleParams;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    alerts = {
      counter: sinon.stub(),
      gauge: sinon.stub(),
      histogram: sinon.stub(),
    };

    dualRealtimeCommunicator = {
      fetchMessagesFromBothSystems: sinon.stub(),
    };

    moduleParams = {
      services: {
        loggerManager: {
          getLogger: sinon.stub().returns(logger),
        },
        alerts,
        dualRealtimeCommunicator,
      },
      config: {},
    } as unknown as ModuleParams;

    messageFetcherService = new MessageFetcherService(moduleParams);
  });

  describe('init', () => {
    it('should initialize successfully', async () => {
      await messageFetcherService.init();

      expect((logger.info as sinon.SinonStub).calledWith('Initializing Message Fetcher Service')).to.be.true;
      expect((logger.info as sinon.SinonStub).calledWith('Message Fetcher Service initialized successfully')).to.be.true;
    });
  });

  describe('fetchMessages', () => {
    const channelId = 'test-channel-123';
    const timeWindow = {
      fromTimestamp: 1000,
      toTimestamp: 2000,
    };

    beforeEach(async () => {
      await messageFetcherService.init();
    });

    it('should fetch messages successfully', async () => {
      const mockResult = {
        pubnubMessages: [{ id: '1' }, { id: '2' }],
        chatServiceMessages: [{ id: '1' }, { id: '2' }],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).resolves(mockResult);

      const result = await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect((dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).calledOnce).to.be.true;
      expect((dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).firstCall.args[0]).to.equal(channelId);
      expect((dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).firstCall.args[1]).to.deep.equal({
        includeMessageActions: true,
        fromTimestamp: timeWindow.fromTimestamp,
        toTimestamp: timeWindow.toTimestamp,
      });

      expect(result.teamId).to.equal(channelId);
      expect(result.channelId).to.equal(channelId);
      expect(result.pubnubMessages).to.deep.equal(mockResult.pubnubMessages);
      expect(result.chatServiceMessages).to.deep.equal(mockResult.chatServiceMessages);
      expect(result.pubnubSuccess).to.be.true;
      expect(result.chatServiceSuccess).to.be.true;
      expect(result.fetchTimestamp).to.be.a('number');

      expect((alerts.counter as sinon.SinonStub).calledWith('chat_comparison.message_fetches', {
        teamId: channelId,
        pubnubSuccess: 'true',
        chatServiceSuccess: 'true',
      })).to.be.true;
    });

    it('should handle partial success when pubnub fails', async () => {
      const mockResult = {
        pubnubMessages: [],
        chatServiceMessages: [{ id: '1' }],
        pubnubSuccess: false,
        chatServiceSuccess: true,
      };

      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).resolves(mockResult);

      const result = await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect(result.pubnubSuccess).to.be.false;
      expect(result.chatServiceSuccess).to.be.true;
      expect((alerts.counter as sinon.SinonStub).calledWith('chat_comparison.message_fetches', {
        teamId: channelId,
        pubnubSuccess: 'false',
        chatServiceSuccess: 'true',
      })).to.be.true;
    });

    it('should handle partial success when chat service fails', async () => {
      const mockResult = {
        pubnubMessages: [{ id: '1' }],
        chatServiceMessages: [],
        pubnubSuccess: true,
        chatServiceSuccess: false,
      };

      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).resolves(mockResult);

      const result = await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect(result.pubnubSuccess).to.be.true;
      expect(result.chatServiceSuccess).to.be.false;
      expect((alerts.counter as sinon.SinonStub).calledWith('chat_comparison.message_fetches', {
        teamId: channelId,
        pubnubSuccess: 'true',
        chatServiceSuccess: 'false',
      })).to.be.true;
    });

    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Fetch failed');
      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).rejects(error);

      const result: FetchResult = await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect((logger.error as sinon.SinonStub).calledWith('Failed to fetch messages for channel', {
        channelId,
        error: error.message,
        stack: error.stack,
      })).to.be.true;

      expect((alerts.counter as sinon.SinonStub).calledWith('chat_comparison.fetch_errors', { teamId: channelId })).to.be.true;

      expect(result.teamId).to.equal(channelId);
      expect(result.channelId).to.equal(channelId);
      expect(result.pubnubMessages).to.deep.equal([]);
      expect(result.chatServiceMessages).to.deep.equal([]);
      expect(result.pubnubSuccess).to.be.false;
      expect(result.chatServiceSuccess).to.be.false;
      expect(result.fetchTimestamp).to.be.a('number');
      expect(result.error).to.equal(error.message);
    });

    it('should log fetch parameters', async () => {
      const mockResult = {
        pubnubMessages: [],
        chatServiceMessages: [],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).resolves(mockResult);

      await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect((logger.info as sinon.SinonStub).calledWith('Fetching messages for channel', {
        channelId,
        fromTimestamp: timeWindow.fromTimestamp,
        toTimestamp: timeWindow.toTimestamp,
      })).to.be.true;
    });

    it('should set teamId equal to channelId', async () => {
      const mockResult = {
        pubnubMessages: [],
        chatServiceMessages: [],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      (dualRealtimeCommunicator.fetchMessagesFromBothSystems as sinon.SinonStub).resolves(mockResult);

      const result = await messageFetcherService.fetchMessages(channelId, timeWindow);

      expect(result.teamId).to.equal(channelId);
      expect(result.channelId).to.equal(channelId);
    });
  });

  describe('lifecycle methods', () => {
    it('should handle postInit', async () => {
      await messageFetcherService.postInit();
    });

    it('should handle deepHealth', async () => {
      await messageFetcherService.deepHealth();
    });

    it('should handle destroy', async () => {
      await messageFetcherService.destroy();
    });
  });
});
