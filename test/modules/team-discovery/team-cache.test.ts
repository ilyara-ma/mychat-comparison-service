import { expect } from 'chai';
import TeamCache from '../../../src/modules/team-discovery/team-cache';
import { Team } from '../../../src/types';

describe('TeamCache', () => {
  let teamCache: TeamCache;

  beforeEach(() => {
    teamCache = new TeamCache();
  });

  describe('setTeams', () => {
    it('should set teams and update timestamp', () => {
      const teams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      teamCache.setTeams(teams);

      expect(teamCache.getTeams()).to.deep.equal(teams);
      expect(teamCache.getLastUpdate()).to.not.be.null;
    });

    it('should update existing teams', () => {
      const teams1: Team[] = [{ teamId: '1', channelId: 'ch1' }];
      const teams2: Team[] = [{ teamId: '2', channelId: 'ch2' }];

      teamCache.setTeams(teams1);
      const timestamp1 = teamCache.getLastUpdate();

      setTimeout(() => {
        teamCache.setTeams(teams2);
        expect(teamCache.getTeams()).to.deep.equal(teams2);
        expect(teamCache.getLastUpdate()).to.be.greaterThan(timestamp1!);
      }, 10);
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

  describe('getLastUpdate', () => {
    it('should return null initially', () => {
      expect(teamCache.getLastUpdate()).to.be.null;
    });

    it('should return timestamp after setting teams', () => {
      const teams: Team[] = [{ teamId: '1', channelId: 'ch1' }];

      teamCache.setTeams(teams);

      expect(teamCache.getLastUpdate()).to.not.be.null;
      expect(teamCache.getLastUpdate()).to.be.a('number');
    });
  });

  describe('clear', () => {
    it('should clear teams and timestamp', () => {
      const teams: Team[] = [{ teamId: '1', channelId: 'ch1' }];

      teamCache.setTeams(teams);
      teamCache.clear();

      expect(teamCache.getTeams()).to.be.an('array').that.is.empty;
      expect(teamCache.getLastUpdate()).to.be.null;
    });
  });

  describe('size', () => {
    it('should return 0 initially', () => {
      expect(teamCache.size()).to.equal(0);
    });

    it('should return correct size', () => {
      const teams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
        { teamId: '3', channelId: 'ch3' },
      ];

      teamCache.setTeams(teams);

      expect(teamCache.size()).to.equal(3);
    });
  });
});
