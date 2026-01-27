import { Team } from '../../types';

export interface ITeamsDAL {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  getTeamsData: (params: { teamIds: string[] }) => Promise<{ value: Team[] | Team; err?: Error }>;
}
