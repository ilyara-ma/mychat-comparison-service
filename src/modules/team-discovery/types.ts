export interface ITeamsDAL {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  getTeamsData: (params: { teamIds?: string[]; limit?: number }) => Promise<{
    value?: unknown;
    err?: Error;
  }>;
}
