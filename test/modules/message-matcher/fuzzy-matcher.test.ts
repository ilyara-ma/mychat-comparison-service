import { expect } from 'chai';
import sinon from 'sinon';
import FuzzyMatcher from '../../../src/modules/message-matcher/fuzzy-matcher';
import { ILogger } from '../../../src/types';

describe('FuzzyMatcher', () => {
  let fuzzyMatcher: FuzzyMatcher;
  let logger: ILogger;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    fuzzyMatcher = new FuzzyMatcher(logger);
  });

  describe('findMatch', () => {
    it('should return null for null chat message', () => {
      const pubnubMessages = [{ timetoken: '12345000000', message: { text: 'hello' } }];

      const result = fuzzyMatcher.findMatch(null as any, pubnubMessages);

      expect(result).to.be.null;
    });

    it('should return null for empty pubnub messages array', () => {
      const chatMsg = { id: '1', content: { text: 'hello' }, createdAt: 1234500 };

      const result = fuzzyMatcher.findMatch(chatMsg, []);

      expect(result).to.be.null;
    });

    it('should return null for null pubnub messages', () => {
      const chatMsg = { id: '1', content: { text: 'hello' }, createdAt: 1234500 };

      const result = fuzzyMatcher.findMatch(chatMsg, null as any);

      expect(result).to.be.null;
    });

    it('should return null when chat message has no content', () => {
      const chatMsg = { id: '1', createdAt: 1234500 };
      const pubnubMessages = [{ timetoken: '12345000000', message: { text: 'hello' } }];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.be.null;
    });

    it('should return null when chat message has no timestamp', () => {
      const chatMsg = { id: '1', content: { text: 'hello' } };
      const pubnubMessages = [{ timetoken: '12345000000', message: { text: 'hello' } }];

      const result = fuzzyMatcher.findMatch(chatMsg as any, pubnubMessages);

      expect(result).to.be.null;
    });

    it('should find match with identical content and timestamp within tolerance', () => {
      const chatMsg = {
        id: '1',
        content: { text: 'hello', userId: '123' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12345000000', message: { text: 'hello', userId: '123' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
      expect(result?.timetoken).to.equal('12345000000');
      expect((logger.debug as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should find match with nested message structure', () => {
      const chatMsg = {
        message: {
          id: '1',
          content: { text: 'hello' },
          createdAt: 1234500,
        },
      };
      const pubnubMessages = [
        { timetoken: '12345000000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
      expect(result?.timetoken).to.equal('12345000000');
    });

    it('should not match when content differs', () => {
      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12345000000', message: { text: 'world' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.be.null;
    });

    it('should not match when timestamp difference exceeds tolerance', () => {
      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12400000000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.be.null;
    });

    it('should skip pubnub messages without timetoken', () => {
      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { message: { text: 'hello' } },
        { timetoken: '12345000000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
      expect(result?.timetoken).to.equal('12345000000');
    });

    it('should find match from multiple pubnub messages', () => {
      const chatMsg = {
        id: '2',
        content: { text: 'world' },
        createdAt: 2345600,
      };
      const pubnubMessages = [
        { timetoken: '12345000000', message: { text: 'hello' } },
        { timetoken: '23456000000', message: { text: 'world' } },
        { timetoken: '34567000000', message: { text: 'foo' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
      expect(result?.timetoken).to.equal('23456000000');
    });

    it('should match when content hash matches despite timestamp being at tolerance edge', () => {
      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12349999000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
    });
  });

  describe('setTimeTolerance', () => {
    it('should update time tolerance', () => {
      fuzzyMatcher.setTimeTolerance(10000);

      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12355000000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.not.be.null;
    });

    it('should reject matches outside new tolerance', () => {
      fuzzyMatcher.setTimeTolerance(1000);

      const chatMsg = {
        id: '1',
        content: { text: 'hello' },
        createdAt: 1234500,
      };
      const pubnubMessages = [
        { timetoken: '12356000000', message: { text: 'hello' } },
      ];

      const result = fuzzyMatcher.findMatch(chatMsg, pubnubMessages);

      expect(result).to.be.null;
    });
  });
});
