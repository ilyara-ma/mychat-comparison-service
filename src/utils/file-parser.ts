class FileParser {
  public async parseTeamChannelIds(
    file: { buffer: Buffer; mimetype?: string; filename?: string },
  ): Promise<{ teamIds?: string[]; channelIds?: string[] }> {
    const content = file.buffer.toString('utf-8').trim();

    if (!content) {
      throw new Error('File is empty');
    }

    try {
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        return { teamIds: parsed.filter((id): id is string => typeof id === 'string') };
      }

      if (typeof parsed === 'object' && parsed !== null) {
        const result: { teamIds?: string[]; channelIds?: string[] } = {};
        const parsedObj = parsed as { teamIds?: unknown; channelIds?: unknown };

        if (Array.isArray(parsedObj.teamIds)) {
          result.teamIds = parsedObj.teamIds.filter((id: unknown): id is string => typeof id === 'string');
        }

        if (Array.isArray(parsedObj.channelIds)) {
          result.channelIds = parsedObj.channelIds.filter((id: unknown): id is string => typeof id === 'string');
        }

        return result;
      }

      throw new Error('Invalid JSON format: expected object or array');
    } catch (error) {
      if ((error as Error).message.includes('Invalid JSON format') || (error as Error).message.includes('File is empty')) {
        throw error;
      }
      throw new Error(`Failed to parse JSON file: ${(error as Error).message}`);
    }
  }
}

export default FileParser;
