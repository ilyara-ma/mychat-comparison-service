import { expect } from 'chai';
import TeamCache from '../../../src/modules/team-discovery/team-cache';
import { Team } from '../../../src/types';

describe('TeamCache', () => {
  let teamCache: TeamCache;

  beforeEach(() => {
    teamCache = new TeamCache();
  });

  describe('setTeams', () => {
    it('should set teams', () => {
      const teams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      teamCache.setTeams(teams);

      expect(teamCache.getTeams()).to.deep.equal(teams);
    });

    it('should update existing teams', () => {
      const teams1: Team[] = [{ teamId: '1', channelId: 'ch1' }];
      const teams2: Team[] = [{ teamId: '2', channelId: 'ch2' }];

      teamCache.setTeams(teams1);
      teamCache.setTeams(teams2);

      expect(teamCache.getTeams()).to.deep.equal(teams2);
    });
  });

  describe('getTeams', () => {
    it('should return empty array initially', () => {
      expect(teamCache.getTeams()).to.be.an('array').that.is.empty;
    });

    it('should return set teams', () => {
      const teams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      teamCache.setTeams(teams);

      expect(teamCache.getTeams()).to.deep.equal(teams);
    });
  });


});
