import { expect } from 'chai';
import OrderingValidator from '../../../src/modules/comparison-engine/ordering-validator';
import { MessagePair } from '../../../src/modules/comparison-engine/types';

describe('OrderingValidator', () => {
  let orderingValidator: OrderingValidator;

  beforeEach(() => {
    orderingValidator = new OrderingValidator();
  });

  describe('validate', () => {
    it('should return empty array for empty matched pairs', () => {
      const result = orderingValidator.validate([]);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for null matched pairs', () => {
      const result = orderingValidator.validate(null as unknown as MessagePair[]);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for single matched pair', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { offset: 100 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should detect ordering violations', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { offset: 100 },
        },
        {
          pubnubMsg: { timetoken: '200' },
          chatMsg: { offset: 50 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.have.lengthOf(1);
      expect(result[0].index).to.equal(1);
      expect(result[0].prevPubnubTimetoken).to.equal('100');
      expect(result[0].currPubnubTimetoken).to.equal('200');
    });

    it('should not detect violations for correct ordering', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { offset: 100 },
        },
        {
          pubnubMsg: { timetoken: '200' },
          chatMsg: { offset: 200 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle messages without timetoken', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: {},
          chatMsg: { offset: 100 },
        },
        {
          pubnubMsg: { timetoken: '200' },
          chatMsg: { offset: 200 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle messages without offset', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: {},
        },
        {
          pubnubMsg: { timetoken: '200' },
          chatMsg: { offset: 200 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should extract offset from nested message structure', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { message: { offset: 100 } },
        },
        {
          pubnubMsg: { timetoken: '200' },
          chatMsg: { message: { offset: 50 } },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.have.lengthOf(1);
    });

    it('should handle equal values correctly', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { offset: 100 },
        },
        {
          pubnubMsg: { timetoken: '100' },
          chatMsg: { offset: 100 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle large timetoken values', () => {
      const matchedPairs: MessagePair[] = [
        {
          pubnubMsg: { timetoken: '16094592000000000' },
          chatMsg: { offset: 100 },
        },
        {
          pubnubMsg: { timetoken: '16094592010000000' },
          chatMsg: { offset: 50 },
        },
      ];

      const result = orderingValidator.validate(matchedPairs);

      expect(result).to.have.lengthOf(1);
    });
  });
});
