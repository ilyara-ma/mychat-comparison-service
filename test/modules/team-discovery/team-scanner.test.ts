import { expect } from 'chai';
import sinon from 'sinon';
import TeamScanner from '../../../src/modules/team-discovery/team-scanner';
import { ILogger, Team } from '../../../src/types';
import { ITeamsDAL } from '../../../src/modules/team-discovery/types';

describe('TeamScanner', () => {
  let teamScanner: TeamScanner;
  let logger: ILogger;
  let teamsDAL: ITeamsDAL;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    teamsDAL = {
      init: sinon.stub().resolves(),
      destroy: sinon.stub().resolves(),
      getTeamsData: sinon.stub(),
    };

    teamScanner = new TeamScanner(logger, teamsDAL);
  });

  describe('getTeamsByIds', () => {
    it('should fetch teams by IDs successfully', async () => {
      const teamIds = ['1', '2'];
      const dbTeams = [
        { teamId: '1', channelId: 'ch1', id: '1' },
        { teamId: '2', channelId: 'ch2', id: '2' },
      ];
      const expectedTeams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ value: dbTeams });

      const result = await teamScanner.getTeamsByIds(teamIds);

      expect(result).to.deep.equal(expectedTeams);
      expect((teamsDAL.getTeamsData as sinon.SinonStub).calledWith({ teamIds })).to.be.true;
      expect((logger.info as sinon.SinonStub).callCount).to.equal(2);
    });

    it('should transform single team result to array', async () => {
      const teamIds = ['1'];
      const dbTeam = { teamId: '1', channelId: 'ch1', id: '1' };
      const expectedTeams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
      ];

      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ value: dbTeam });

      const result = await teamScanner.getTeamsByIds(teamIds);

      expect(result).to.deep.equal(expectedTeams);
      expect((teamsDAL.getTeamsData as sinon.SinonStub).calledWith({ teamIds })).to.be.true;
    });

    it('should use teamId as channelId when channelId is missing', async () => {
      const teamIds = ['1'];
      const dbTeam = { teamId: '1', id: '1' };
      const expectedTeams: Team[] = [
        { teamId: '1', channelId: '1' },
      ];

      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ value: dbTeam });

      const result = await teamScanner.getTeamsByIds(teamIds);

      expect(result).to.deep.equal(expectedTeams);
    });

    it('should handle errors from DAL', async () => {
      const teamIds = ['1', '2'];
      const error = new Error('Database error');
      (teamsDAL.getTeamsData as sinon.SinonStub).rejects(error);

      try {
        await teamScanner.getTeamsByIds(teamIds);
        expect.fail('Should have thrown error');
      } catch (e) {
        expect(e).to.equal(error);
        expect((logger.error as sinon.SinonStub).callCount).to.equal(1);
      }
    });

    it('should handle err in result', async () => {
      const teamIds = ['1', '2'];
      const error = new Error('Database error');
      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ err: error });

      try {
        await teamScanner.getTeamsByIds(teamIds);
        expect.fail('Should have thrown error');
      } catch (e) {
        expect(e).to.equal(error);
        expect((logger.error as sinon.SinonStub).callCount).to.equal(1);
      }
    });
  });
});
