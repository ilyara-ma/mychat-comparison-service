import { expect } from 'chai';
import sinon from 'sinon';
import ComparisonRoute from '../../src/routes/comparison-route';
import { IServices } from '../../src/types';
import { IComparisonScheduler, ITeamDiscoveryService } from '../../src/services/types';

describe('ComparisonRoute', () => {
  let comparisonRoute: ComparisonRoute;
  let services: Partial<IServices>;
  let comparisonScheduler: IComparisonScheduler;
  let teamDiscoveryService: ITeamDiscoveryService;
  let logger: {
    info: sinon.SinonStub;
    error: sinon.SinonStub;
    warn: sinon.SinonStub;
    debug: sinon.SinonStub;
  };

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    comparisonScheduler = {
      runManualComparison: sinon.stub(),
    };

    teamDiscoveryService = {
      refreshTeams: sinon.stub().resolves(),
      getCachedTeams: sinon.stub(),
    };

    services = {
      loggerManager: {
        getLogger: sinon.stub().returns(logger),
      },
      comparisonScheduler,
      teamDiscoveryService,
    } as Partial<IServices>;

    comparisonRoute = new ComparisonRoute({ services: services as IServices, config: {} });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init', () => {
    it('should initialize successfully', async () => {
      await comparisonRoute.init();
      expect(comparisonRoute).to.exist;
    });
  });

  describe('runComparison', () => {
    beforeEach(async () => {
      await comparisonRoute.init();
    });

    it('should run comparison with team IDs from request body', async () => {
      const teamIds = ['team1', 'team2'];
      const mockResults = [
        { teamId: 'team1', channelId: 'ch1', metrics: {} },
        { teamId: 'team2', channelId: 'ch2', metrics: {} },
      ];

      (comparisonScheduler.runManualComparison as sinon.SinonStub).resolves(mockResults);

      const req = {
        body: { teamIds },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect((comparisonScheduler.runManualComparison as sinon.SinonStub).calledWith(teamIds)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        success: true,
        teamCount: 2,
        comparisonCount: 2,
        results: mockResults,
      })).to.be.true;
    });

    it('should run comparison with team IDs from query params as string', async () => {
      const teamIds = ['team1', 'team2'];
      const mockResults = [{ teamId: 'team1', channelId: 'ch1', metrics: {} }];

      (comparisonScheduler.runManualComparison as sinon.SinonStub).resolves(mockResults);

      const req = {
        query: { teamIds: 'team1,team2' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect((comparisonScheduler.runManualComparison as sinon.SinonStub).calledWith(teamIds)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should run comparison with team IDs from query params as array', async () => {
      const teamIds = ['team1', 'team2'];
      const mockResults = [{ teamId: 'team1', channelId: 'ch1', metrics: {} }];

      (comparisonScheduler.runManualComparison as sinon.SinonStub).resolves(mockResults);

      const req = {
        query: { teamIds },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect((comparisonScheduler.runManualComparison as sinon.SinonStub).calledWith(teamIds)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should use all cached teams when no team IDs provided', async () => {
      const allTeams = [
        { teamId: 'team1', channelId: 'ch1' },
        { teamId: 'team2', channelId: 'ch2' },
        { teamId: 'team3', channelId: 'ch3' },
      ];
      const mockResults = [
        { teamId: 'team1', channelId: 'ch1', metrics: {} },
        { teamId: 'team2', channelId: 'ch2', metrics: {} },
      ];

      (teamDiscoveryService.getCachedTeams as sinon.SinonStub).returns(allTeams);
      (comparisonScheduler.runManualComparison as sinon.SinonStub).resolves(mockResults);

      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect((comparisonScheduler.runManualComparison as sinon.SinonStub).calledWith(undefined)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        success: true,
        teamCount: 3,
        comparisonCount: 2,
        results: mockResults,
      })).to.be.true;
    });

    it('should return error when no teams are available', async () => {
      const error = new Error('No teams found for manual comparison');
      (comparisonScheduler.runManualComparison as sinon.SinonStub).rejects(error);

      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({
        error: 'Comparison failed',
        message: 'No teams found for manual comparison',
      })).to.be.true;
    });

    it('should handle comparison errors gracefully', async () => {
      const teamIds = ['team1'];
      const error = new Error('Comparison failed');

      (comparisonScheduler.runManualComparison as sinon.SinonStub).rejects(error);

      const req = {
        body: { teamIds },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({
        error: 'Comparison failed',
        message: 'Comparison failed',
      })).to.be.true;
      expect(logger.error.called).to.be.true;
    });

    it('should filter empty team IDs from query string', async () => {
      const mockResults = [{ teamId: 'team1', channelId: 'ch1', metrics: {} }];

      (comparisonScheduler.runManualComparison as sinon.SinonStub).resolves(mockResults);

      const req = {
        query: { teamIds: 'team1, ,team2,  ' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await comparisonRoute.runComparison(req as never, res as never);

      expect((comparisonScheduler.runManualComparison as sinon.SinonStub).calledWith(['team1', 'team2'])).to.be.true;
    });
  });
});
