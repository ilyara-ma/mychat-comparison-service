import {
  IAlerts, ILogger, ModuleParams, Team,
} from '../../types';
import TeamCache from './team-cache';
import TeamScanner from './team-scanner';
import { ITeamsDAL } from './types';

class TeamDiscoveryService {
  private services: ModuleParams['services'];

  private config: Record<string, unknown>;

  private logger: ILogger;

  private alerts: IAlerts;

  private teamsDAL: ITeamsDAL;

  private teamScanner: TeamScanner;

  private teamCache: TeamCache;

  constructor(params: ModuleParams) {
    const { services, config } = params;
    this.services = services;
    this.config = config || {};
    this.logger = services.loggerManager.getLogger('team-discovery');
    this.alerts = services.alerts;
    this.teamCache = new TeamCache();

    const TeamsDAL = require('@moonactive/teams-dal');
    this.teamsDAL = new TeamsDAL({
      services: this.services,
      config: (this.config.teamsDAL as Record<string, unknown>) || {},
    }) as ITeamsDAL;

    this.teamScanner = new TeamScanner(this.logger, this.teamsDAL);
  }

  public async initialize(): Promise<void> {
    await this.teamsDAL.init();
    await this._refreshTeams();
  }

  public getCachedTeams(): Team[] {
    return this.teamCache.getTeams();
  }

  public async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    const cachedTeams = this.teamCache.getTeams();
    const cachedTeamIds = new Set(cachedTeams.map((team) => team.teamId));
    const missingTeamIds = teamIds.filter((teamId) => !cachedTeamIds.has(teamId));

    if (missingTeamIds.length === 0) {
      return cachedTeams.filter((team) => teamIds.includes(team.teamId));
    }

    this.logger.info('Fetching missing teams from DAL', {
      missingCount: missingTeamIds.length,
      requestedCount: teamIds.length,
    });

    const fetchedTeams = await this.teamScanner!.getTeamsByIds(missingTeamIds);
    const allTeams = [...cachedTeams, ...fetchedTeams];
    this.teamCache.setTeams(allTeams);

    return allTeams.filter((team) => teamIds.includes(team.teamId));
  }

  private async _refreshTeams(): Promise<void> {
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

  private async _discoverTeams(): Promise<Team[]> {
    const manualTeamIds = this._getManualTeamIds();

    if (manualTeamIds && manualTeamIds.length > 0) {
      this.logger.info('Using manual team ID override', { count: manualTeamIds.length });
      return this.teamScanner.getTeamsByIds(manualTeamIds);
    }

    this.logger.warn('No manual team IDs configured - returning empty team list');
    return [];
  }

  private _getManualTeamIds(): string[] {
    const config = (this.config.comparisonScheduler as Record<string, unknown>)?.comparisonScheduler as Record<string, string[]> || {};
    const teamIds = config.teamIdsOverride || [];

    this.logger.info('Loading manual team IDs from config', { teamIds });
    return teamIds;
  }
}

export default TeamDiscoveryService;
