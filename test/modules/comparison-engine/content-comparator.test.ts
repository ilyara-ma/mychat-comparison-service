import { expect } from 'chai';
import ContentComparator from '../../../src/modules/comparison-engine/content-comparator';

describe('ContentComparator', () => {
  let contentComparator: ContentComparator;

  beforeEach(() => {
    contentComparator = new ContentComparator();
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

    it('should detect type mismatches', () => {
      const pubnubMsg = { message: { count: 123 } };
      const chatServiceMsg = { content: { count: '123' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
      expect(result.differences?.some((d) => d.type === 'type_mismatch')).to.be.true;
    });

    it('should detect missing keys in pubnub', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'hello', extra: 'field' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
      expect(result.differences?.some((d) => d.type === 'missing_in_pubnub')).to.be.true;
    });

    it('should detect missing keys in chatService', () => {
      const pubnubMsg = { message: { text: 'hello', extra: 'field' } };
      const chatServiceMsg = { content: { text: 'hello' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
      expect(result.differences?.some((d) => d.type === 'missing_in_chatservice')).to.be.true;
    });
  });
});
