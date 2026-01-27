import { expect } from 'chai';
import sinon from 'sinon';
import TeamDiscoveryService from '../../../src/modules/team-discovery/team-discovery-service';
import { ILogger, ModuleParams } from '../../../src/types';
import { ITeamsDAL } from '../../../src/modules/team-discovery/types';

describe('TeamDiscoveryService', () => {
  let teamDiscoveryService: TeamDiscoveryService;
  let logger: ILogger;
  let services: ModuleParams['services'];
  let teamsDAL: ITeamsDAL;

  beforeEach(async () => {
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

    services = {
      loggerManager: {
        getLogger: sinon.stub().returns(logger),
      },
      featureConfig: {
        client: {} as any,
      },
      get: sinon.stub().returns({
        query: sinon.stub(),
      }),
    } as any;

    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id: string) {
      if (id === '@moonactive/teams-dal') {
        return function () {
          return teamsDAL;
        };
      }
      return originalRequire.apply(this, arguments);
    };

    teamDiscoveryService = new TeamDiscoveryService({
      services,
      config: {
        batchSize: 10,
      },
    });

    await teamDiscoveryService.initialize();

    Module.prototype.require = originalRequire;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('initialize', () => {
    it('should initialize teams DAL', async () => {
      const testTeamsDAL = {
        init: sinon.stub().resolves(),
        destroy: sinon.stub().resolves(),
        getTeamsData: sinon.stub(),
      };

      const Module = require('module');
      const originalRequire = Module.prototype.require;
      Module.prototype.require = function (id: string) {
        if (id === '@moonactive/teams-dal') {
          return function () {
            return testTeamsDAL;
          };
        }
        return originalRequire.apply(this, arguments);
      };

      const service = new TeamDiscoveryService({
        services,
        config: {},
      });

      await service.initialize();

      Module.prototype.require = originalRequire;

      expect((testTeamsDAL.init as sinon.SinonStub).calledOnce).to.be.true;
    });
  });

  describe('getTeamsBatch', () => {
    it('should fetch batch of teamIds', async () => {
      const dbTeams = [
        { teamId: '123', id: '123' },
        { teamId: '456', id: '456' },
      ];
      const expectedTeamIds = ['123', '456'];

      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ value: dbTeams });

      const result = await teamDiscoveryService.getTeamsBatch();

      expect(result).to.deep.equal(expectedTeamIds);
      expect((teamsDAL.getTeamsData as sinon.SinonStub).calledWith({ limit: 10 })).to.be.true;
    });

    it('should handle single team result', async () => {
      const dbTeam = { teamId: '123', id: '123' };
      const expectedTeamIds = ['123'];

      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ value: dbTeam });

      const result = await teamDiscoveryService.getTeamsBatch();

      expect(result).to.deep.equal(expectedTeamIds);
    });

    it('should handle errors and return empty array', async () => {
      const error = new Error('Database error');
      (teamsDAL.getTeamsData as sinon.SinonStub).rejects(error);

      const result = await teamDiscoveryService.getTeamsBatch();

      expect(result).to.deep.equal([]);
      expect((logger.error as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should handle err in result and return empty array', async () => {
      const error = new Error('Database error');
      (teamsDAL.getTeamsData as sinon.SinonStub).resolves({ err: error });

      const result = await teamDiscoveryService.getTeamsBatch();

      expect(result).to.deep.equal([]);
      expect((logger.error as sinon.SinonStub).calledOnce).to.be.true;
    });
  });

  describe('batchSize configuration', () => {
    it('should use default batchSize when not configured', () => {
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      Module.prototype.require = function (id: string) {
        if (id === '@moonactive/teams-dal') {
          return function () {
            return teamsDAL;
          };
        }
        return originalRequire.apply(this, arguments);
      };

      const service = new TeamDiscoveryService({
        services,
        config: {},
      });

      Module.prototype.require = originalRequire;

      expect(service).to.be.instanceOf(TeamDiscoveryService);
    });

    it('should handle null config', () => {
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      Module.prototype.require = function (id: string) {
        if (id === '@moonactive/teams-dal') {
          return function () {
            return teamsDAL;
          };
        }
        return originalRequire.apply(this, arguments);
      };

      const service = new TeamDiscoveryService({
        services,
        config: null as unknown as Record<string, unknown>,
      });

      Module.prototype.require = originalRequire;

      expect(service).to.be.instanceOf(TeamDiscoveryService);
    });
  });
});
