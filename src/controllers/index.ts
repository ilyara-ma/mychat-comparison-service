import { Services } from '@moonactive/microservice-core';
import { IComparisonRunner } from '../services/types';
import { ILogger } from '../types';

type Request = {
  body?: {
    teamIds?: string[];
    channelIds?: string[];
  };
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
  send: (data: unknown) => void;
};

async function runComparison(req: Request, res: Response): Promise<void> {
  const loggerManager = Services.get('loggerManager') as { getLogger: (name: string) => ILogger };
  const logger = loggerManager.getLogger('comparison-route');
  const comparisonRunner = Services.get('comparisonRunner') as IComparisonRunner;

  try {
    const teamIds = req.body?.teamIds;
    const channelIds = req.body?.channelIds;

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

export default {
  api: {
    v1: {
      comparison: {
        run: {
          post: runComparison,
        },
      },
    },
  },
};
