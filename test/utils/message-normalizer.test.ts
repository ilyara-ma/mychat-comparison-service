import { expect } from 'chai';
import MessageNormalizer from '../../src/utils/message-normalizer';

describe('MessageNormalizer', () => {
  let messageNormalizer: MessageNormalizer;

  beforeEach(() => {
    messageNormalizer = new MessageNormalizer();
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
      expect(messageNormalizer.areContentsEqual(true, false)).to.be.false;
    });

    it('should return false for different types', () => {
      expect(messageNormalizer.areContentsEqual('123', 123)).to.be.false;
      expect(messageNormalizer.areContentsEqual(null, undefined)).to.be.false;
    });

    it('should return true for objects with same keys in different order', () => {
      const obj1 = { a: '1', b: '2' };
      const obj2 = { b: '2', a: '1' };

      expect(messageNormalizer.areContentsEqual(obj1, obj2)).to.be.true;
    });

    it('should return false for objects with different values', () => {
      const obj1 = { a: '1', b: '2' };
      const obj2 = { a: '1', b: '3' };

      expect(messageNormalizer.areContentsEqual(obj1, obj2)).to.be.false;
    });

    it('should return true for nested objects with same structure', () => {
      const obj1 = { a: { b: { c: '1' } } };
      const obj2 = { a: { b: { c: '1' } } };

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
});
