import { Services } from '@moonactive/microservice-core';
import { IComparisonScheduler, ITeamDiscoveryService } from '../services/types';
import { ILogger } from '../types';

type Request = {
  body?: {
    teamIds?: string[];
    channelIds?: string[];
  };
  query?: {
    teamIds?: string | string[];
    channelIds?: string | string[];
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
  const comparisonScheduler = Services.get('comparisonScheduler') as IComparisonScheduler;
  const teamDiscoveryService = Services.get('teamDiscoveryService') as ITeamDiscoveryService;

  try {
    let teamIds: string[] | undefined;
    let channelIds: string[] | undefined;

    if (req.body?.teamIds && Array.isArray(req.body.teamIds)) {
      teamIds = req.body.teamIds;
    } else if (req.query?.teamIds) {
      if (typeof req.query.teamIds === 'string') {
        teamIds = req.query.teamIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
      } else if (Array.isArray(req.query.teamIds)) {
        teamIds = req.query.teamIds.map((id) => (typeof id === 'string' ? id.trim() : String(id))).filter((id) => id.length > 0);
      }
    }

    if (req.body?.channelIds && Array.isArray(req.body.channelIds)) {
      channelIds = req.body.channelIds;
    } else if (req.query?.channelIds) {
      if (typeof req.query.channelIds === 'string') {
        channelIds = req.query.channelIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
      } else if (Array.isArray(req.query.channelIds)) {
        channelIds = req.query.channelIds.map((id) => (typeof id === 'string' ? id.trim() : String(id))).filter((id) => id.length > 0);
      }
    }

    const teamCountForLog = teamIds ? teamIds.length : 'all';
    const channelCountForLog = channelIds ? channelIds.length : undefined;
    logger.info('Running on-demand comparison', {
      teamIds: teamIds || 'all teams',
      teamCount: teamCountForLog,
      channelIds: channelIds || undefined,
      channelCount: channelCountForLog,
    });

    const results = await comparisonScheduler.runManualComparison(teamIds, channelIds);

    const actualTeamCount = teamIds?.length || (channelIds ? 0 : teamDiscoveryService.getCachedTeams().length);
    const actualChannelCount = channelIds?.length || 0;

    res.status(200).json({
      success: true,
      teamCount: actualTeamCount,
      channelCount: actualChannelCount,
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
