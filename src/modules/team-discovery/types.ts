import { Team } from '../../types';

export interface ITeamsDAL {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  getTeamsByIds: (teamIds: string[]) => Promise<Team[]>;
  scanActiveTeams: () => Promise<Team[]>;
}
