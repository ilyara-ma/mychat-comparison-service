import { ILogger, Team } from '../../types';
import { ITeamsDAL } from './types';

class TeamScanner {
  private logger: ILogger;

  private teamsDAL: ITeamsDAL;

  constructor(logger: ILogger, teamsDAL: ITeamsDAL) {
    this.logger = logger;
    this.teamsDAL = teamsDAL;
  }

  public async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    try {
      this.logger.info('Fetching teams by IDs', { count: teamIds.length });
      const result = await this.teamsDAL.getTeamsData({ teamIds });
      if (result.err) {
        throw result.err;
      }
      const teamsData = Array.isArray(result.value) ? result.value : [result.value];
      const teams: Team[] = teamsData.map((teamData: Record<string, unknown>) => ({
        teamId: teamData.teamId as string,
        channelId: (teamData.channelId || teamData.teamId) as string,
      }));
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
