import { IComparisonScheduler, ITeamDiscoveryService } from '../services/types';
import { ModuleParams } from '../types';

type Request = {
  body?: {
    teamIds?: string[];
  };
  query?: {
    teamIds?: string | string[];
  };
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
  send: (data: unknown) => void;
};

class ComparisonRoute {
  private services: ModuleParams['services'];

  private logger: ReturnType<ModuleParams['services']['loggerManager']['getLogger']>;

  private comparisonScheduler: IComparisonScheduler | null;

  private teamDiscoveryService: ITeamDiscoveryService | null;

  constructor(params: ModuleParams) {
    this.services = params.services;
    this.logger = this.services.loggerManager.getLogger('comparison-route');
    this.comparisonScheduler = null;
    this.teamDiscoveryService = null;
  }

  public async init(): Promise<void> {
    this.comparisonScheduler = this.services.comparisonScheduler as IComparisonScheduler;
    this.teamDiscoveryService = this.services.teamDiscoveryService as ITeamDiscoveryService;
  }

  public async postInit(): Promise<void> {
    await Promise.resolve();
  }

  public async deepHealth(): Promise<void> {
    await Promise.resolve();
  }

  public async destroy(): Promise<void> {
    await Promise.resolve();
  }

  public async runComparison(req: Request, res: Response): Promise<void> {
    try {
      let teamIds: string[] | undefined;

      if (req.body?.teamIds && Array.isArray(req.body.teamIds)) {
        teamIds = req.body.teamIds;
      } else if (req.query?.teamIds) {
        if (typeof req.query.teamIds === 'string') {
          teamIds = req.query.teamIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
        } else if (Array.isArray(req.query.teamIds)) {
          teamIds = req.query.teamIds.map((id) => (typeof id === 'string' ? id.trim() : String(id))).filter((id) => id.length > 0);
        }
      }

      const teamCountForLog = teamIds ? teamIds.length : 'all';
      this.logger.info('Running on-demand comparison', {
        teamIds: teamIds || 'all teams',
        teamCount: teamCountForLog,
      });

      const results = await this.comparisonScheduler!.runManualComparison(teamIds);

      const actualTeamCount = teamIds?.length || this.teamDiscoveryService!.getCachedTeams().length;

      res.status(200).json({
        success: true,
        teamCount: actualTeamCount,
        comparisonCount: results.length,
        results,
      });
    } catch (error) {
      this.logger.error('On-demand comparison failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        error: 'Comparison failed',
        message: (error as Error).message,
      });
    }
  }
}

export default ComparisonRoute;
