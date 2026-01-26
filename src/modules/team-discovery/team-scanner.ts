import { ILogger, Team } from '../../types';
import { ITeamsDAL } from './types';

class TeamScanner {
  private logger: ILogger;

  private teamsDAL: ITeamsDAL;

  constructor(logger: ILogger, teamsDAL: ITeamsDAL) {
    this.logger = logger;
    this.teamsDAL = teamsDAL;
  }

  public async scanTeams(): Promise<Team[]> {
    try {
      this.logger.info('Scanning for active teams');
      const teams = await this.teamsDAL.scanActiveTeams();
      this.logger.info('Team scan completed', { count: teams.length });
      return teams;
    } catch (error) {
      this.logger.error('Failed to scan teams', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  public async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    try {
      this.logger.info('Fetching teams by IDs', { count: teamIds.length });
      const teams = await this.teamsDAL.getTeamsByIds(teamIds);
      this.logger.info('Teams fetched successfully', { count: teams.length });
      return teams;
    } catch (error) {
      this.logger.error('Failed to fetch teams by IDs', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }
}

export default TeamScanner;
