import { Team } from '../../types';

class TeamCache {
  private teams: Team[];

  constructor() {
    this.teams = [];
  }

  public setTeams(teams: Team[]): void {
    this.teams = teams;
  }

  public getTeams(): Team[] {
    return this.teams;
  }
}

export default TeamCache;
