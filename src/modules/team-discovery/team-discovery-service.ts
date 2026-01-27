import {
  IAlerts, ILogger, ModuleParams,
} from '../../types';
import { ITeamsDAL } from './types';

class TeamDiscoveryService {
  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private teamsDAL: ITeamsDAL;

  private batchSize: number;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('team-discovery');
    this.alerts = services.alerts;

    const TeamsDAL = require('@moonactive/teams-dal');
    this.teamsDAL = new TeamsDAL({
      services,
      config: (this.config.teamsDAL as Record<string, unknown>) || {},
    }) as ITeamsDAL;

    const schedulerConfig = (this.config.comparisonScheduler as Record<string, unknown>)?.comparisonScheduler as Record<string, unknown> || {};
    this.batchSize = (schedulerConfig.batchSize as number) || 50;
  }

  public async initialize(): Promise<void> {
    await this.teamsDAL.init();
  }

  public async getTeamsBatch(): Promise<string[]> {
    try {
      const result = await this.teamsDAL.getTeamsData({ limit: this.batchSize });

      if (result.err) {
        throw result.err;
      }

      const teamsData = Array.isArray(result.value) ? result.value : [result.value];
      const teamIds: string[] = teamsData.map((teamData: Record<string, unknown>) => teamData.teamId as string);

      this.alerts.gauge('chat_comparison.discovered_teams_count', {}, teamIds.length);
      return teamIds;
    } catch (error) {
      this.logger.error('Failed to fetch teams batch', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      this.alerts.counter('chat_comparison.team_discovery_failures', {});
      return [];
    }
  }
}

export default TeamDiscoveryService;
