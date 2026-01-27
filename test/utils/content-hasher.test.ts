import { expect } from 'chai';
import ContentHasher from '../../src/utils/content-hasher';

describe('ContentHasher', () => {
  let contentHasher: ContentHasher;

  beforeEach(() => {
    contentHasher = new ContentHasher();
  });

  describe('hashContent', () => {
    it('should generate consistent hashes for identical content', () => {
      const content1 = { text: 'hello', userId: '123' };
      const content2 = { text: 'hello', userId: '123' };

      const hash1 = contentHasher.hashContent(content1);
      const hash2 = contentHasher.hashContent(content2);

      expect(hash1).to.equal(hash2);
    });

    it('should generate different hashes for different content', () => {
      const content1 = { text: 'hello' };
      const content2 = { text: 'world' };

      const hash1 = contentHasher.hashContent(content1);
      const hash2 = contentHasher.hashContent(content2);

      expect(hash1).to.not.equal(hash2);
    });

    it('should ignore metadata fields', () => {
      const content1 = { text: 'hello', userId: '123' };
      const content2 = {
        text: 'hello',
        userId: '123',
        metadata: { pubnubTimetoken: '12345' },
      };

      const hash1 = contentHasher.hashContent(content1);
      const hash2 = contentHasher.hashContent(content2);

      expect(hash1).to.equal(hash2);
    });

    it('should return null for null content', () => {
      const hash = contentHasher.hashContent(null);
      expect(hash).to.be.null;
    });
  });
});
