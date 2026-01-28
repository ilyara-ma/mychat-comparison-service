import { expect } from 'chai';
import ChannelIdBuilder from '../../src/utils/channel-id-builder';

describe('ChannelIdBuilder', () => {
  describe('constructor', () => {
    it('should use default prefixes when not provided', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal([
        'team_read_write.123',
        'team_readonly.123',
        'team_join_requests.123',
        'team_gift_rewards.123',
      ]);
    });

    it('should use default prefixes when empty array provided', () => {
      const builder = new ChannelIdBuilder([]);
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal([
        'team_read_write.123',
        'team_readonly.123',
        'team_join_requests.123',
        'team_gift_rewards.123',
      ]);
    });

    it('should use provided prefixes', () => {
      const builder = new ChannelIdBuilder(['test_', 'lobby_']);
      const result = builder.buildChannelIds('123');

      expect(result).to.deep.equal(['test_123', 'lobby_123']);
    });
  });

  describe('buildChannelIds', () => {
    it('should build channels with default prefixes', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.buildChannelIds('456');

      expect(result).to.deep.equal([
        'team_read_write.456',
        'team_readonly.456',
        'team_join_requests.456',
        'team_gift_rewards.456',
      ]);
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
      const builder = new ChannelIdBuilder();
      const result = builder.buildChannelIds('');

      expect(result).to.deep.equal([
        'team_read_write.',
        'team_readonly.',
        'team_join_requests.',
        'team_gift_rewards.',
      ]);
    });

    it('should maintain prefix order', () => {
      const builder = new ChannelIdBuilder(['a_', 'b_', 'c_']);
      const result = builder.buildChannelIds('test');

      expect(result).to.deep.equal(['a_test', 'b_test', 'c_test']);
    });
  });

  describe('extractTeamId', () => {
    it('should extract teamId from channelId with default prefix', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.extractTeamId('team_read_write.123');

      expect(result).to.equal('123');
    });

    it('should extract teamId from channelId with multiple default prefixes', () => {
      const builder = new ChannelIdBuilder();

      expect(builder.extractTeamId('team_read_write.456')).to.equal('456');
      expect(builder.extractTeamId('team_readonly.456')).to.equal('456');
      expect(builder.extractTeamId('team_join_requests.456')).to.equal('456');
      expect(builder.extractTeamId('team_gift_rewards.456')).to.equal('456');
    });

    it('should extract teamId from channelId with custom prefixes', () => {
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
      const builder = new ChannelIdBuilder();
      const result = builder.extractTeamId('123');

      expect(result).to.equal('123');
    });

    it('should extract using first matching prefix', () => {
      const builder = new ChannelIdBuilder(['team_read_write.', 'team_']);
      const result = builder.extractTeamId('team_read_write.789');

      expect(result).to.equal('789');
    });

    it('should handle empty teamId after prefix removal', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.extractTeamId('team_read_write.');

      expect(result).to.equal('');
    });

    it('should handle complex teamIds', () => {
      const builder = new ChannelIdBuilder();
      const result = builder.extractTeamId('team_read_write.abc-123-xyz');

      expect(result).to.equal('abc-123-xyz');
    });
  });
});
