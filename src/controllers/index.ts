import { Services } from '@moonactive/microservice-core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IComparisonRunner } from '../services/types';
import { ILogger } from '../types';
import FileParser from '../utils/file-parser';

type JsonRequest = {
  body?: {
    teamIds?: string[];
    channelIds?: string[];
  };
};

type FileRequest = {
  query: {
    filePath: string;
  };
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
  send: (data: unknown) => void;
};

async function executeComparison(
  teamIds: string[] | undefined,
  channelIds: string[] | undefined,
  res: Response,
): Promise<void> {
  const loggerManager = Services.get('loggerManager') as { getLogger: (name: string) => ILogger };
  const logger = loggerManager.getLogger('comparison-route');
  const comparisonRunner = Services.get('comparisonRunner') as IComparisonRunner;

  try {
    const results = await comparisonRunner.runManualComparison(teamIds, channelIds);

    res.status(200).json({
      success: true,
      teamCount: teamIds?.length || 0,
      channelCount: channelIds?.length || 0,
      comparisonCount: results.length,
      results,
    });
  } catch (error) {
    logger.error('On-demand comparison failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    res.status(500).json({
      error: 'Comparison failed',
      message: (error as Error).message,
    });
  }
}

async function runComparison(req: JsonRequest, res: Response): Promise<void> {
  const teamIds = req.body?.teamIds;
  const channelIds = req.body?.channelIds;

  await executeComparison(teamIds, channelIds, res);
}

async function runComparisonFromFile(req: FileRequest, res: Response): Promise<void> {
  const fileParser = new FileParser();
  let teamIds: string[] | undefined;
  let channelIds: string[] | undefined;

  try {
    const { filePath } = req.query;
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

    try {
      const fileContent = await fs.readFile(resolvedPath, 'utf-8');
      const fileBuffer = Buffer.from(fileContent);
      const fileData = await fileParser.parseTeamChannelIds({
        buffer: fileBuffer,
        mimetype: 'application/json',
        filename: path.basename(filePath),
      });

      if (fileData.teamIds) {
        teamIds = fileData.teamIds;
      }

      if (fileData.channelIds) {
        channelIds = fileData.channelIds;
      }
    } catch (fileError) {
      res.status(400).json({
        error: 'File read failed',
        message: `Failed to read file at path "${filePath}": ${(fileError as Error).message}`,
      });
      return;
    }

    if (!teamIds && !channelIds) {
      res.status(400).json({
        error: 'Invalid file',
        message: 'JSON file must contain teamIds and/or channelIds',
      });
      return;
    }

    await executeComparison(teamIds, channelIds, res);
  } catch (error) {
    const loggerManager = Services.get('loggerManager') as { getLogger: (name: string) => ILogger };
    const logger = loggerManager.getLogger('comparison-route');
    logger.error('File path comparison failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    res.status(500).json({
      error: 'Comparison failed',
      message: (error as Error).message,
    });
  }
}

export default {
  api: {
    v1: {
      comparison: {
        run: {
          post: runComparison,
        },
        'run-from-file': {
          post: runComparisonFromFile,
        },
      },
    },
  },
};
