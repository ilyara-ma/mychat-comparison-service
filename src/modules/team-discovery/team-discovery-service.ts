import {
  ILogger, ModuleParams,
} from '../../types';
import { ITeamsDAL } from './types';

function getTeamsDAL(): new (params: { services: ModuleParams['services']; config: Record<string, unknown> }) => ITeamsDAL {
  return require('@moonactive/teams-dal');
}

class TeamDiscoveryService {
  private config: Record<string, unknown>;

  private logger: ILogger;

  private teamsDAL: ITeamsDAL | null;

  private batchSize: number;

  private services: ModuleParams['services'];

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.config = config || {};
    this.services = services;
    this.logger = services.loggerManager.getLogger('team-discovery');
    this.teamsDAL = null;

    this.batchSize = (this.config.batchSize as number) || 50;
  }

  public async initialize(): Promise<void> {
    if (!this.teamsDAL) {
      const TeamsDAL = getTeamsDAL();
      const teamsDALConfig = (this.config.teamsDAL as Record<string, unknown>) || {};
      this.teamsDAL = new TeamsDAL({
        services: this.services,
        config: teamsDALConfig,
      }) as ITeamsDAL;
    }
    await this.teamsDAL.init();
  }

  public async getTeamsBatch(): Promise<string[]> {
    if (!this.teamsDAL) {
      throw new Error('TeamDiscoveryService not initialized. Call initialize() first.');
    }
    try {
      const result = await this.teamsDAL.getTeamsData({ limit: this.batchSize });

      if (result.err) {
        throw result.err;
      }

      const teamsData = Array.isArray(result.value) ? result.value : [result.value];
      const teamIds: string[] = teamsData.map((teamData: Record<string, unknown>) => teamData.teamId as string);

      return teamIds;
    } catch (error) {
      this.logger.error('Failed to fetch teams batch', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return [];
    }
  }
}

export default TeamDiscoveryService;
