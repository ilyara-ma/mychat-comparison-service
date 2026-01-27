import { expect } from 'chai';
import ChannelIdBuilder from '../../src/utils/channel-id-builder';

describe('ChannelIdBuilder', () => {
  describe('constructor', () => {
    it('should use default prefix when not provided', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal(['team_123']);
    });

    it('should use default prefix when empty array provided', () => {
      const builder = new ChannelIdBuilder([]);
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal(['team_123']);
    });

    it('should use provided prefixes', () => {
      const builder = new ChannelIdBuilder(['test_', 'lobby_']);
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal(['test_123', 'lobby_123']);
    });
  });

  describe('buildChannelIds', () => {
    it('should build single channelId with single prefix', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.buildChannelIds('456');

      expect(result).to.deep.equal(['team_456']);
    });

    it('should build multiple channelIds with multiple prefixes', () => {
      const builder = new ChannelIdBuilder(['team_', 'lobby_', 'chat_']);
      const result = builder.buildChannelIds('789');

      expect(result).to.deep.equal(['team_789', 'lobby_789', 'chat_789']);
    });

    it('should handle numeric teamId', () => {
      const builder = new ChannelIdBuilder(['prefix_']);
      const result = builder.buildChannelIds('12345');

      expect(result).to.deep.equal(['prefix_12345']);
    });

    it('should handle empty string teamId', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.buildChannelIds('');

      expect(result).to.deep.equal(['team_']);
    });

    it('should maintain prefix order', () => {
      const builder = new ChannelIdBuilder(['a_', 'b_', 'c_']);
      const result = builder.buildChannelIds('test');

      expect(result).to.deep.equal(['a_test', 'b_test', 'c_test']);
    });
  });

  describe('extractTeamId', () => {
    it('should extract teamId from channelId with single prefix', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.extractTeamId('team_123');

      expect(result).to.equal('123');
    });

    it('should extract teamId from channelId with multiple prefixes', () => {
      const builder = new ChannelIdBuilder(['team_', 'lobby_', 'chat_']);

      expect(builder.extractTeamId('team_456')).to.equal('456');
      expect(builder.extractTeamId('lobby_456')).to.equal('456');
      expect(builder.extractTeamId('chat_456')).to.equal('456');
    });

    it('should return channelId unchanged if no prefix matches', () => {
      const builder = new ChannelIdBuilder(['team_', 'lobby_']);
      const result = builder.extractTeamId('other_123');

      expect(result).to.equal('other_123');
    });

    it('should handle channelId without prefix', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.extractTeamId('123');

      expect(result).to.equal('123');
    });

    it('should extract using first matching prefix', () => {
      const builder = new ChannelIdBuilder(['team_', 't_']);
      const result = builder.extractTeamId('team_789');

      expect(result).to.equal('789');
    });

    it('should handle empty teamId after prefix removal', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.extractTeamId('team_');

      expect(result).to.equal('');
    });

    it('should handle complex teamIds', () => {
      const builder = new ChannelIdBuilder(['team_']);
      const result = builder.extractTeamId('team_abc-123-xyz');

      expect(result).to.equal('abc-123-xyz');
    });
  });
});
