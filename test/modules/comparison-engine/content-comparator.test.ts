import { expect } from 'chai';
import sinon from 'sinon';
import ContentComparator from '../../../src/modules/comparison-engine/content-comparator';
import { ILogger } from '../../../src/types';

describe('ContentComparator', () => {
  let contentComparator: ContentComparator;
  let logger: ILogger;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    contentComparator = new ContentComparator(logger);
  });

  describe('compareContent', () => {
    it('should return equal true for identical messages', () => {
      const pubnubMsg = { message: { text: 'hello', userId: '123' } };
      const chatServiceMsg = { content: { text: 'hello', userId: '123' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.true;
      expect(result.differences).to.be.undefined;
    });

    it('should return equal false with differences for different messages', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'world' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
      expect(result.differences).to.have.length.greaterThan(0);
    });

    it('should ignore metadata in chatService messages', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = {
        content: {
          text: 'hello',
          metadata: { pubnubTimetoken: '12345' },
        },
      };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.true;
    });


    it('should handle both null contents as equal', () => {
      const pubnubMsg = null;
      const chatServiceMsg = null;

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.true;
    });

    it('should handle null pubnub content as not equal', () => {
      const pubnubMsg = null;
      const chatServiceMsg = { content: { text: 'hello' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
    });

    it('should return detailed differences for non-matching content', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'world' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
    });
  });
});
