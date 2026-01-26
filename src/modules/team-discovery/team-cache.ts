import { Team } from '../../types';

class TeamCache {
  private teams: Team[];

  private lastUpdate: number | null;

  constructor() {
    this.teams = [];
    this.lastUpdate = null;
  }

  public setTeams(teams: Team[]): void {
    this.teams = teams;
    this.lastUpdate = Date.now();
  }

  public getTeams(): Team[] {
    return this.teams;
  }

  public size(): number {
    return this.teams.length;
  }
}

export default TeamCache;
