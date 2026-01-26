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
      scanActiveTeams: sinon.stub(),
      getTeamsByIds: sinon.stub(),
    };

    teamScanner = new TeamScanner(logger, teamsDAL);
  });

  describe('scanTeams', () => {
    it('should scan teams successfully', async () => {
      const expectedTeams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      (teamsDAL.scanActiveTeams as sinon.SinonStub).resolves(expectedTeams);

      const result = await teamScanner.scanTeams();

      expect(result).to.deep.equal(expectedTeams);
      expect((teamsDAL.scanActiveTeams as sinon.SinonStub).callCount).to.equal(1);
      expect((logger.info as sinon.SinonStub).callCount).to.equal(2);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (teamsDAL.scanActiveTeams as sinon.SinonStub).rejects(error);

      try {
        await teamScanner.scanTeams();
        expect.fail('Should have thrown error');
      } catch (e) {
        expect(e).to.equal(error);
        expect((logger.error as sinon.SinonStub).callCount).to.equal(1);
      }
    });
  });

  describe('getTeamsByIds', () => {
    it('should fetch teams by IDs successfully', async () => {
      const teamIds = ['1', '2'];
      const expectedTeams: Team[] = [
        { teamId: '1', channelId: 'ch1' },
        { teamId: '2', channelId: 'ch2' },
      ];

      (teamsDAL.getTeamsByIds as sinon.SinonStub).resolves(expectedTeams);

      const result = await teamScanner.getTeamsByIds(teamIds);

      expect(result).to.deep.equal(expectedTeams);
      expect((teamsDAL.getTeamsByIds as sinon.SinonStub).calledWith(teamIds)).to.be.true;
      expect((logger.info as sinon.SinonStub).callCount).to.equal(2);
    });

    it('should handle errors', async () => {
      const teamIds = ['1', '2'];
      const error = new Error('Database error');
      (teamsDAL.getTeamsByIds as sinon.SinonStub).rejects(error);

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
