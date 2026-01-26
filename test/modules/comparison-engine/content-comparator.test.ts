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

  describe('areEqual', () => {
    it('should return true for identical messages', () => {
      const pubnubMsg = { message: { text: 'hello', userId: '123' } };
      const chatServiceMsg = { content: { text: 'hello', userId: '123' } };

      const result = contentComparator.areEqual(pubnubMsg, chatServiceMsg);

      expect(result).to.be.true;
    });

    it('should return false for different messages', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'world' } };

      const result = contentComparator.areEqual(pubnubMsg, chatServiceMsg);

      expect(result).to.be.false;
    });

    it('should ignore metadata in chatService messages', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = {
        content: {
          text: 'hello',
          metadata: { pubnubTimetoken: '12345' },
        },
      };

      const result = contentComparator.areEqual(pubnubMsg, chatServiceMsg);

      expect(result).to.be.true;
    });
  });

  describe('compareContent', () => {
    it('should return equal true for matching content', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'hello' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.true;
    });

    it('should return differences for non-matching content', () => {
      const pubnubMsg = { message: { text: 'hello' } };
      const chatServiceMsg = { content: { text: 'world' } };

      const result = contentComparator.compareContent(pubnubMsg, chatServiceMsg);

      expect(result.equal).to.be.false;
      expect(result.differences).to.be.an('array');
    });
  });

  describe('findDifferences', () => {
    it('should identify type mismatches', () => {
      const obj1 = { value: 'string' };
      const obj2 = { value: 123 };

      const differences = contentComparator.findDifferences(obj1, obj2);

      expect(differences).to.have.lengthOf(1);
      expect(differences[0].type).to.equal('type_mismatch');
    });

    it('should identify missing keys', () => {
      const obj1 = { key1: 'value1', key2: 'value2' };
      const obj2 = { key1: 'value1' };

      const differences = contentComparator.findDifferences(obj1, obj2);

      expect(differences).to.have.lengthOf(1);
      expect(differences[0].type).to.equal('missing_in_chatservice');
    });

    it('should identify value mismatches', () => {
      const obj1 = { key: 'value1' };
      const obj2 = { key: 'value2' };

      const differences = contentComparator.findDifferences(obj1, obj2);

      expect(differences).to.have.lengthOf(1);
      expect(differences[0].type).to.equal('value_mismatch');
    });
  });
});
