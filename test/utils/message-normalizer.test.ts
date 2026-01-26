import { expect } from 'chai';
import MessageNormalizer from '../../src/utils/message-normalizer';

describe('MessageNormalizer', () => {
  let messageNormalizer: MessageNormalizer;

  beforeEach(() => {
    messageNormalizer = new MessageNormalizer();
  });

  describe('normalizePubnubMessage', () => {
    it('should return null for null message', () => {
      const result = messageNormalizer.normalizePubnubMessage(null);
      expect(result).to.be.null;
    });

    it('should return null for undefined message', () => {
      const result = messageNormalizer.normalizePubnubMessage(undefined);
      expect(result).to.be.null;
    });

    it('should normalize pubnub message with message field', () => {
      const pubnubMsg = {
        timetoken: '12345',
        message: { text: 'hello' },
        actions: { emoji: { value: '👍' } },
      };

      const result = messageNormalizer.normalizePubnubMessage(pubnubMsg);

      expect(result).to.deep.equal({
        timetoken: '12345',
        content: { text: 'hello' },
        actions: { emoji: { value: '👍' } },
      });
    });

    it('should normalize pubnub message without message field', () => {
      const pubnubMsg = {
        timetoken: '12345',
        text: 'hello',
      };

      const result = messageNormalizer.normalizePubnubMessage(pubnubMsg);

      expect(result?.timetoken).to.equal('12345');
      expect(result?.content).to.equal(pubnubMsg);
    });

    it('should provide empty actions object when not present', () => {
      const pubnubMsg = {
        timetoken: '12345',
        message: { text: 'hello' },
      };

      const result = messageNormalizer.normalizePubnubMessage(pubnubMsg);

      expect(result?.actions).to.deep.equal({});
    });
  });

  describe('normalizeChatServiceMessage', () => {
    it('should return null for null message', () => {
      const result = messageNormalizer.normalizeChatServiceMessage(null);
      expect(result).to.be.null;
    });

    it('should return null for undefined message', () => {
      const result = messageNormalizer.normalizeChatServiceMessage(undefined);
      expect(result).to.be.null;
    });

    it('should normalize chat service message with nested structure', () => {
      const chatMsg = {
        message: {
          id: '123',
          content: { text: 'hello' },
          actions: { emoji: { value: '👍' } },
          offset: 100,
          createdAt: '2023-01-01',
        },
      };

      const result = messageNormalizer.normalizeChatServiceMessage(chatMsg);

      expect(result).to.deep.equal({
        messageId: '123',
        content: { text: 'hello' },
        actions: { emoji: { value: '👍' } },
        offset: 100,
        createdAt: '2023-01-01',
      });
    });

    it('should normalize chat service message with flat structure', () => {
      const chatMsg = {
        id: '123',
        content: { text: 'hello' },
        actions: { emoji: { value: '👍' } },
        offset: 100,
        createdAt: '2023-01-01',
      };

      const result = messageNormalizer.normalizeChatServiceMessage(chatMsg);

      expect(result).to.deep.equal({
        messageId: '123',
        content: { text: 'hello' },
        actions: { emoji: { value: '👍' } },
        offset: 100,
        createdAt: '2023-01-01',
      });
    });

    it('should fallback to message when content is missing', () => {
      const chatMsg = {
        message: {
          id: '123',
          text: 'hello',
        },
      };

      const result = messageNormalizer.normalizeChatServiceMessage(chatMsg);

      expect(result?.messageId).to.equal('123');
      expect(result?.content).to.deep.equal({ id: '123', text: 'hello' });
    });

    it('should provide empty actions object when not present', () => {
      const chatMsg = {
        id: '123',
        content: { text: 'hello' },
      };

      const result = messageNormalizer.normalizeChatServiceMessage(chatMsg);

      expect(result?.actions).to.deep.equal({});
    });
  });

  describe('extractMessageContent', () => {
    it('should return null for null message', () => {
      const result = messageNormalizer.extractMessageContent(null);
      expect(result).to.be.null;
    });

    it('should return null for undefined message', () => {
      const result = messageNormalizer.extractMessageContent(undefined);
      expect(result).to.be.null;
    });

    it('should extract content from pubnub message field', () => {
      const message = {
        timetoken: '12345',
        message: { text: 'hello' },
      };

      const result = messageNormalizer.extractMessageContent(message, 'pubnub');

      expect(result).to.deep.equal({ text: 'hello' });
    });

    it('should extract content from pubnub content field', () => {
      const message = {
        timetoken: '12345',
        content: { text: 'hello' },
      };

      const result = messageNormalizer.extractMessageContent(message, 'pubnub');

      expect(result).to.deep.equal({ text: 'hello' });
    });

    it('should return whole message for pubnub if no message or content field', () => {
      const message = {
        timetoken: '12345',
        text: 'hello',
      };

      const result = messageNormalizer.extractMessageContent(message, 'pubnub');

      expect(result).to.equal(message);
    });

    it('should extract content from chatService content field', () => {
      const message = {
        id: '123',
        content: { text: 'hello' },
      };

      const result = messageNormalizer.extractMessageContent(message, 'chatService');

      expect(result).to.deep.equal({ text: 'hello' });
    });

    it('should extract content from chatService nested message.content', () => {
      const message = {
        message: {
          id: '123',
          content: { text: 'hello' },
        },
      };

      const result = messageNormalizer.extractMessageContent(message, 'chatService');

      expect(result).to.deep.equal({ text: 'hello' });
    });

    it('should return whole message for chatService if no content field', () => {
      const message = {
        id: '123',
        text: 'hello',
      };

      const result = messageNormalizer.extractMessageContent(message, 'chatService');

      expect(result).to.equal(message);
    });

    it('should default to pubnub source', () => {
      const message = {
        message: { text: 'hello' },
      };

      const result = messageNormalizer.extractMessageContent(message);

      expect(result).to.deep.equal({ text: 'hello' });
    });
  });

  describe('areContentsEqual', () => {
    it('should return true for identical primitive values', () => {
      expect(messageNormalizer.areContentsEqual('hello', 'hello')).to.be.true;
      expect(messageNormalizer.areContentsEqual(123, 123)).to.be.true;
      expect(messageNormalizer.areContentsEqual(true, true)).to.be.true;
    });

    it('should return false for different primitive values', () => {
      expect(messageNormalizer.areContentsEqual('hello', 'world')).to.be.false;
      expect(messageNormalizer.areContentsEqual(123, 456)).to.be.false;
    });

    it('should return false for different types', () => {
      expect(messageNormalizer.areContentsEqual('123', 123)).to.be.false;
      expect(messageNormalizer.areContentsEqual(true, 'true')).to.be.false;
    });

    it('should return true for objects with same keys in different order', () => {
      const obj1 = { b: '2', a: '1' };
      const obj2 = { a: '1', b: '2' };

      expect(messageNormalizer.areContentsEqual(obj1, obj2)).to.be.true;
    });

    it('should return false for objects with different values', () => {
      const obj1 = { a: '1', b: '2' };
      const obj2 = { a: '1', b: '3' };

      expect(messageNormalizer.areContentsEqual(obj1, obj2)).to.be.false;
    });

    it('should return true for nested objects with same structure', () => {
      const obj1 = { a: { c: '3', b: '2' }, d: '4' };
      const obj2 = { d: '4', a: { b: '2', c: '3' } };

      expect(messageNormalizer.areContentsEqual(obj1, obj2)).to.be.true;
    });

    it('should return false when one object is null', () => {
      expect(messageNormalizer.areContentsEqual({ a: '1' }, null)).to.be.false;
      expect(messageNormalizer.areContentsEqual(null, { a: '1' })).to.be.false;
    });

    it('should handle arrays correctly', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      expect(messageNormalizer.areContentsEqual(arr1, arr2)).to.be.true;
    });
  });

  describe('sortKeys', () => {
    it('should sort object keys', () => {
      const obj = { c: '3', a: '1', b: '2' };

      const result = messageNormalizer.sortKeys(obj) as Record<string, string>;

      expect(Object.keys(result)).to.deep.equal(['a', 'b', 'c']);
    });

    it('should handle nested objects', () => {
      const obj = { c: { z: '1', y: '2' }, a: '1' };

      const result = messageNormalizer.sortKeys(obj) as Record<string, unknown>;

      expect(Object.keys(result)).to.deep.equal(['a', 'c']);
      expect(Object.keys(result.c as Record<string, unknown>)).to.deep.equal(['y', 'z']);
    });

    it('should handle arrays', () => {
      const obj = { a: [{ b: '2' }, { a: '1' }] };

      const result = messageNormalizer.sortKeys(obj);

      expect(result).to.not.be.null;
    });

    it('should return primitives unchanged', () => {
      expect(messageNormalizer.sortKeys('hello')).to.equal('hello');
      expect(messageNormalizer.sortKeys(123)).to.equal(123);
      expect(messageNormalizer.sortKeys(null)).to.be.null;
    });
  });
});
