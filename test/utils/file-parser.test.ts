import { expect } from 'chai';
import FileParser from '../../src/utils/file-parser';

describe('FileParser', () => {
  let fileParser: FileParser;

  beforeEach(() => {
    fileParser = new FileParser();
  });

  describe('parseTeamChannelIds', () => {
    it('should parse JSON file with teamIds array', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify({ teamIds: ['team1', 'team2'] })),
        mimetype: 'application/json',
        filename: 'teams.json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.deep.equal(['team1', 'team2']);
      expect(result.channelIds).to.be.undefined;
    });

    it('should parse JSON file with channelIds array', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify({ channelIds: ['channel1', 'channel2'] })),
        mimetype: 'application/json',
        filename: 'channels.json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.channelIds).to.deep.equal(['channel1', 'channel2']);
      expect(result.teamIds).to.be.undefined;
    });

    it('should parse JSON file with both teamIds and channelIds', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify({ teamIds: ['team1'], channelIds: ['channel1'] })),
        mimetype: 'application/json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.deep.equal(['team1']);
      expect(result.channelIds).to.deep.equal(['channel1']);
    });

    it('should parse JSON file with simple array as teamIds', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify(['team1', 'team2'])),
        mimetype: 'application/json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.deep.equal(['team1', 'team2']);
      expect(result.channelIds).to.be.undefined;
    });

    it('should throw error for empty file', async () => {
      const file = {
        buffer: Buffer.from(''),
        mimetype: 'application/json',
      };

      try {
        await fileParser.parseTeamChannelIds(file);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('File is empty');
      }
    });

    it('should throw error for invalid JSON format', async () => {
      const file = {
        buffer: Buffer.from('"just a string"'),
        mimetype: 'application/json',
      };

      try {
        await fileParser.parseTeamChannelIds(file);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include('Invalid JSON format');
      }
    });

    it('should filter out non-string values from JSON arrays', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify({ teamIds: ['team1', 123, null, 'team2', true] })),
        mimetype: 'application/json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.deep.equal(['team1', 'team2']);
    });

    it('should throw error for invalid JSON', async () => {
      const file = {
        buffer: Buffer.from('{ invalid json }'),
        mimetype: 'application/json',
      };

      try {
        await fileParser.parseTeamChannelIds(file);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include('Failed to parse JSON file');
      }
    });

    it('should handle empty object', async () => {
      const file = {
        buffer: Buffer.from('{}'),
        mimetype: 'application/json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.be.undefined;
      expect(result.channelIds).to.be.undefined;
    });

    it('should handle object with null values', async () => {
      const file = {
        buffer: Buffer.from(JSON.stringify({ teamIds: null, channelIds: null })),
        mimetype: 'application/json',
      };

      const result = await fileParser.parseTeamChannelIds(file);

      expect(result.teamIds).to.be.undefined;
      expect(result.channelIds).to.be.undefined;
    });
  });
});
