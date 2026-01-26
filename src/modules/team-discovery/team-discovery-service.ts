import {
  IAlerts, IFeatureConfigClient, ILogger, ModuleParams, Team,
} from '../../types';
import TeamCache from './team-cache';
import TeamScanner from './team-scanner';
import { ITeamsDAL } from './types';

class TeamDiscoveryService {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private featureConfigClient: IFeatureConfigClient;

  private teamsDAL: ITeamsDAL | null;

  private teamScanner: TeamScanner | null;

  private teamCache: TeamCache;

  private discoveryInterval: NodeJS.Timeout | null;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('team-discovery');
    this.alerts = services.alerts;
    this.featureConfigClient = services.featureConfig.client;
    this.teamsDAL = null;
    this.teamScanner = null;
    this.teamCache = new TeamCache();
    this.discoveryInterval = null;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing Team Discovery Service');

    const TeamsDAL = require('@moonactive/teams-dal');
    this.teamsDAL = new TeamsDAL({
      services: this.services,
      config: (this.config.teamsDAL as Record<string, unknown>) || {},
    }) as ITeamsDAL;

    await this.teamsDAL.init();

    this.teamScanner = new TeamScanner(this.logger, this.teamsDAL);

    await this.refreshTeams();

    this.logger.info('Team Discovery Service initialized successfully');
  }

  public async postInit(): Promise<void> {
    // Empty implementation
  }

  public async deepHealth(): Promise<void> {
    // Empty implementation
  }

  public async destroy(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    if (this.teamsDAL) {
      await this.teamsDAL.destroy();
    }
  }

  public async refreshTeams(): Promise<void> {
    try {
      this.logger.info('Refreshing teams');
      const teams = await this._discoverTeams();
      this.teamCache.setTeams(teams);
      this.alerts.gauge('chat_comparison.discovered_teams_count', {}, teams.length);
      this.logger.info('Teams refreshed successfully', { count: teams.length });
    } catch (error) {
      this.logger.error('Failed to refresh teams', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      this.alerts.counter('chat_comparison.team_discovery_failures', {});
    }
  }

  public getCachedTeams(): Team[] {
    return this.teamCache.getTeams();
  }

  public getCacheInfo(): { teamCount: number; lastUpdate: number | null } {
    return {
      teamCount: this.teamCache.size(),
      lastUpdate: this.teamCache.getLastUpdate(),
    };
  }

  private async _discoverTeams(): Promise<Team[]> {
    const manualTeamIds = await this._getManualTeamIds();

    if (manualTeamIds && manualTeamIds.length > 0) {
      this.logger.info('Using manual team ID override', { count: manualTeamIds.length });
      return this.teamScanner!.getTeamsByIds(manualTeamIds);
    }

    return this.teamScanner!.scanTeams();
  }

  private async _getManualTeamIds(): Promise<string[]> {
    try {
      const config = await this.featureConfigClient.getValue(
        'chat-comparison-config',
        '',
        {},
        { team_ids_override: [] },
      );

      return (config as Record<string, string[]>).team_ids_override || [];
    } catch (error) {
      this.logger.warn('Failed to get manual team IDs from feature config', {
        error: (error as Error).message,
      });
      return (this.config.comparisonScheduler as Record<string, string[]>)?.teamIdsOverride || [];
    }
  }
}

export default TeamDiscoveryService;
