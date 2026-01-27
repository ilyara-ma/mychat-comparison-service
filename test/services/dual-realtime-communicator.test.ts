import { expect } from 'chai';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { IServices } from '../../src/types';

describe('DualRealtimeCommunicator', () => {
  let DualRealtimeCommunicator: typeof import('../../src/services/dual-realtime-communicator').default;
  let realtimeCommunicationsServiceStub: sinon.SinonStub;
  let pubnubCommunicatorStub: {
    init: sinon.SinonStub;
    destroy: sinon.SinonStub;
    fetchAllMessages: sinon.SinonStub;
  };
  let chatServiceCommunicatorStub: {
    init: sinon.SinonStub;
    destroy: sinon.SinonStub;
    fetchAllMessages: sinon.SinonStub;
  };
  let services: Partial<IServices>;
  let config: Record<string, unknown>;

  beforeEach(() => {
    pubnubCommunicatorStub = {
      init: sinon.stub().resolves(),
      destroy: sinon.stub().resolves(),
      fetchAllMessages: sinon.stub().resolves({ success: true, value: [] }),
    };

    chatServiceCommunicatorStub = {
      init: sinon.stub().resolves(),
      destroy: sinon.stub().resolves(),
      fetchAllMessages: sinon.stub().resolves({ success: true, value: [] }),
    };

    realtimeCommunicationsServiceStub = sinon.stub();
    realtimeCommunicationsServiceStub.onFirstCall().returns(pubnubCommunicatorStub);
    realtimeCommunicationsServiceStub.onSecondCall().returns(chatServiceCommunicatorStub);

    DualRealtimeCommunicator = proxyquire('../../src/services/dual-realtime-communicator', {
      '@moonactive/moonactive-realtime-communications': realtimeCommunicationsServiceStub,
    }).default;

    services = {
      loggerManager: {
        getLogger: sinon.stub().returns({
          info: sinon.stub(),
          error: sinon.stub(),
          warn: sinon.stub(),
          debug: sinon.stub(),
        }),
      },
      alerts: {
        counter: sinon.stub(),
        gauge: sinon.stub(),
        histogram: sinon.stub(),
      },
    } as Partial<IServices>;

    config = {
      realtimeCommunications: {
        pubnub: { publishKey: 'test' },
        chatService: { baseUrl: 'http://test' },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init', () => {
    it('should initialize both communicators', async () => {
      const dualCommunicator = new DualRealtimeCommunicator({ services: services as IServices, config });
      await dualCommunicator.init();

      expect(pubnubCommunicatorStub.init.calledOnce).to.be.true;
      expect(chatServiceCommunicatorStub.init.calledOnce).to.be.true;
    });
  });

  describe('fetchMessagesFromBothSystems', () => {
    it('should fetch messages from both systems successfully', async () => {
      const pubnubMessages = [{ timetoken: '123', message: 'test' }];
      const chatMessages = [{ id: '1', content: 'test' }];

      pubnubCommunicatorStub.fetchAllMessages.resolves({ success: true, value: pubnubMessages });
      chatServiceCommunicatorStub.fetchAllMessages.resolves({ success: true, value: chatMessages });

      const dualCommunicator = new DualRealtimeCommunicator({ services: services as IServices, config });
      await dualCommunicator.init();

      const result = await dualCommunicator.fetchMessagesFromBothSystems('channel_1', {});

      expect(result.pubnubMessages).to.deep.equal(pubnubMessages);
      expect(result.chatServiceMessages).to.deep.equal(chatMessages);
      expect(result.pubnubSuccess).to.be.true;
      expect(result.chatServiceSuccess).to.be.true;
    });

    it('should handle pubnub fetch failure gracefully', async () => {
      pubnubCommunicatorStub.fetchAllMessages.rejects(new Error('PubNub error'));
      chatServiceCommunicatorStub.fetchAllMessages.resolves({ success: true, value: [] });

      const dualCommunicator = new DualRealtimeCommunicator({ services: services as IServices, config });
      await dualCommunicator.init();

      const result = await dualCommunicator.fetchMessagesFromBothSystems('channel_1', {});

      expect(result.pubnubSuccess).to.be.false;
      expect(result.chatServiceSuccess).to.be.true;
      expect(result.pubnubMessages).to.deep.equal([]);
    });

    it('should handle chatService fetch failure gracefully', async () => {
      pubnubCommunicatorStub.fetchAllMessages.resolves({ success: true, value: [] });
      chatServiceCommunicatorStub.fetchAllMessages.rejects(new Error('ChatService error'));

      const dualCommunicator = new DualRealtimeCommunicator({ services: services as IServices, config });
      await dualCommunicator.init();

      const result = await dualCommunicator.fetchMessagesFromBothSystems('channel_1', {});

      expect(result.pubnubSuccess).to.be.true;
      expect(result.chatServiceSuccess).to.be.false;
      expect(result.chatServiceMessages).to.deep.equal([]);
    });
  });
});
