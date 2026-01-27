import { expect } from 'chai';
import sinon from 'sinon';
import MessageMatcher from '../../../src/modules/message-matcher/message-matcher';
import { IAlerts, ILogger, ModuleParams } from '../../../src/types';
import { ChatMessage, PubnubMessage } from '../../../src/modules/message-matcher/types';

describe('MessageMatcher', () => {
  let messageMatcher: MessageMatcher;
  let logger: ILogger;
  let alerts: IAlerts;
  let services: ModuleParams['services'];

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

    services = {
      loggerManager: {
        getLogger: sinon.stub().returns(logger),
      },
      alerts,
      featureConfig: {
        client: {} as any,
      },
    } as any;

    messageMatcher = new MessageMatcher({ services, config: {} });
  });

  describe('init', () => {
    it('should initialize fuzzy matcher', async () => {
      await messageMatcher.init();

      expect((logger.info as sinon.SinonStub).callCount).to.equal(2);
    });
  });

  describe('matchMessages', () => {
    beforeEach(async () => {
      await messageMatcher.init();
    });

    it('should match messages by timetoken', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
        { timetoken: '200', message: { text: 'world' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          id: '100',
          content: {
            text: 'hello',
          },
        },
        {
          id: '200',
          content: {
            text: 'world',
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(2);
      expect(result.pubnubOnly).to.be.an('array').that.is.empty;
      expect(result.chatServiceOnly).to.be.an('array').that.is.empty;
    });

    it('should identify pubnub only messages', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
        { timetoken: '200', message: { text: 'world' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          id: '100',
          content: {
            text: 'hello',
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(1);
      expect(result.pubnubOnly).to.have.lengthOf(1);
      expect((result.pubnubOnly[0] as PubnubMessage).timetoken).to.equal('200');
    });

    it('should identify chat service only messages', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          id: '100',
          content: {
            text: 'hello',
          },
        },
        {
          content: {
            text: 'world',
            timestamp: Date.now(),
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(1);
      expect(result.chatServiceOnly).to.have.lengthOf(1);
    });

    it('should use fuzzy matching when timetoken not found', () => {
      const timestamp = 1000000;
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: String(timestamp * 10000), message: { text: 'hello', userId: 'user1' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          createdAt: timestamp,
          content: {
            text: 'hello',
            userId: 'user1',
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched.length).to.be.greaterThan(0);
      if (result.matched.length > 0) {
        expect((alerts.counter as sinon.SinonStub).calledWith('chat_comparison.fuzzy_matches', {})).to.be.true;
      }
    });

    it('should extract messageId from nested message.id', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          message: {
            id: '100',
            content: {
              text: 'hello',
            },
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(1);
    });

    it('should handle empty arrays', () => {
      const result = messageMatcher.matchMessages([], []);

      expect(result.matched).to.be.an('array').that.is.empty;
      expect(result.pubnubOnly).to.be.an('array').that.is.empty;
      expect(result.chatServiceOnly).to.be.an('array').that.is.empty;
    });
  });
});
