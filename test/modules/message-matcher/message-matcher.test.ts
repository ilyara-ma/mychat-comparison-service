import { expect } from 'chai';
import MessageMatcher from '../../../src/modules/message-matcher/message-matcher';
import { ChatMessage, PubnubMessage } from '../../../src/modules/message-matcher/types';

describe('MessageMatcher', () => {
  let messageMatcher: MessageMatcher;

  beforeEach(() => {
    messageMatcher = new MessageMatcher();
  });

  describe('matchMessages', () => {
    it('should match messages by timetoken', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
        { timetoken: '200', message: { text: 'world' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          message: {
            id: '100',
            text: 'hello',
          },
        },
        {
          message: {
            id: '200',
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
          message: {
            id: '100',
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
          message: {
            id: '100',
            text: 'hello',
          },
        },
        {
          message: {
            text: 'world',
            timestamp: Date.now(),
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(1);
      expect(result.chatServiceOnly).to.have.lengthOf(1);
    });

    it('should not match messages without matching IDs', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello', userId: 'user1' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          message: {
            id: '200',
            text: 'hello',
            userId: 'user1',
          },
        },
      ];

      const result = messageMatcher.matchMessages(pubnubMessages, chatServiceMessages);

      expect(result.matched).to.have.lengthOf(0);
      expect(result.pubnubOnly).to.have.lengthOf(1);
      expect(result.chatServiceOnly).to.have.lengthOf(1);
    });

    it('should extract messageId from nested message.id', () => {
      const pubnubMessages: PubnubMessage[] = [
        { timetoken: '100', message: { text: 'hello' } },
      ];

      const chatServiceMessages: ChatMessage[] = [
        {
          message: {
            id: '100',
            text: 'hello',
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
