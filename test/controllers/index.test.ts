import { expect } from 'chai';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { IComparisonRunner } from '../../src/services/types';
import { ILogger } from '../../src/types';
import * as path from 'path';

describe('Comparison Controller', () => {
  let controller: {
    api: {
      v1: {
        comparison: {
          run: { post: (req: unknown, res: unknown) => Promise<void> };
          'run-from-file': { post: (req: unknown, res: unknown) => Promise<void> };
        };
      };
    };
  };
  let comparisonRunnerStub: IComparisonRunner;
  let loggerStub: ILogger;
  let ServicesStub: {
    get: sinon.SinonStub;
  };

  beforeEach(() => {
    comparisonRunnerStub = {
      runManualComparison: sinon.stub().resolves([]),
    } as unknown as IComparisonRunner;

    loggerStub = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
    };

    ServicesStub = {
      get: sinon.stub(),
    };

    ServicesStub.get.withArgs('loggerManager').returns({
      getLogger: sinon.stub().returns(loggerStub),
    });
    ServicesStub.get.withArgs('comparisonRunner').returns(comparisonRunnerStub);

    controller = proxyquire('../../src/controllers/index', {
      '@moonactive/microservice-core': {
        Services: ServicesStub,
      },
    }).default;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('runComparison', () => {
    it('should handle request with teamIds in body', async () => {
      const req = {
        body: {
          teamIds: ['team1', 'team2'],
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([
        {
          teamId: 'team1',
          channelId: 'ch1',
          timestamp: 1000,
          messageCountDiscrepancy: 0,
          contentMismatchRate: 0,
          orderingViolations: 0,
          coveragePercentage: 100,
          latencyDiffMs: 0,
          chatMissingMessages: 0,
          pubnubMissingMessages: 0,
          totalPubnubMessages: 0,
          totalChatServiceMessages: 0,
        },
      ]);

      await controller.api.v1.comparison.run.post(req, res);

      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(['team1', 'team2'], undefined)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.teamCount).to.equal(2);
      expect(responseData.channelCount).to.equal(0);
    });

    it('should handle request with channelIds in body', async () => {
      const req = {
        body: {
          channelIds: ['channel1', 'channel2'],
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controller.api.v1.comparison.run.post(req, res);

      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(undefined, ['channel1', 'channel2'])).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should handle request with empty body', async () => {
      const req = {
        body: {},
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controller.api.v1.comparison.run.post(req, res);

      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(undefined, undefined)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should handle error from comparison runner', async () => {
      const req = {
        body: {
          teamIds: ['team1'],
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      const error = new Error('Comparison failed');
      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).rejects(error);

      await controller.api.v1.comparison.run.post(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.error).to.equal('Comparison failed');
      expect(responseData.message).to.equal('Comparison failed');
      expect((loggerStub.error as sinon.SinonStub).calledOnce).to.be.true;
    });

  });

  describe('runComparisonFromFile', () => {
    it('should handle filePath query parameter with teamIds', async () => {
      const testFilePath = path.join(__dirname, '../../examples/teams.json');
      const fileContent = JSON.stringify({ teamIds: ['team1', 'team2'] });

      const fsStub = {
        readFile: sinon.stub().resolves(fileContent),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: testFilePath,
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(fsStub.readFile.calledOnce).to.be.true;
      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(['team1', 'team2'], undefined)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should handle JSON file with simple array format', async () => {
      const fileContent = JSON.stringify(['team1', 'team2', 'team3']);

      const fsStub = {
        readFile: sinon.stub().resolves(fileContent),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/teams.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(fsStub.readFile.calledOnce).to.be.true;
      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(['team1', 'team2', 'team3'], undefined)).to.be.true;
    });

    it('should handle file with channelIds', async () => {
      const fileContent = JSON.stringify({ channelIds: ['channel1', 'channel2'] });

      const fsStub = {
        readFile: sinon.stub().resolves(fileContent),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/channels.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(fsStub.readFile.calledOnce).to.be.true;
      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(undefined, ['channel1', 'channel2'])).to.be.true;
    });

    it('should handle file with both teamIds and channelIds', async () => {
      const fileContent = JSON.stringify({ teamIds: ['team1'], channelIds: ['channel1'] });

      const fsStub = {
        readFile: sinon.stub().resolves(fileContent),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/teams-and-channels.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(fsStub.readFile.calledOnce).to.be.true;
      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(['team1'], ['channel1'])).to.be.true;
    });




    it('should handle relative filePath', async () => {
      const fileContent = JSON.stringify({ teamIds: ['team1'] });

      const fsStub = {
        readFile: sinon.stub().resolves(fileContent),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/teams.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).resolves([]);

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(fsStub.readFile.calledOnce).to.be.true;
      expect((comparisonRunnerStub.runManualComparison as sinon.SinonStub).calledWith(['team1'], undefined)).to.be.true;
    });

    it('should return 400 for file read error', async () => {
      const fsStub = {
        readFile: sinon.stub().rejects(new Error('File not found')),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'nonexistent.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.error).to.equal('File read failed');
      expect(responseData.message).to.include('Failed to read file');
    });

    it('should return error when filePath is missing', async () => {
      const req = {
        query: {},
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      try {
        await controller.api.v1.comparison['run-from-file'].post(req, res);
      } catch (error) {
        expect((error as Error).message).to.include('filePath');
      }
    });

    it('should return 400 for empty file', async () => {
      const fsStub = {
        readFile: sinon.stub().resolves(''),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/empty.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.error).to.equal('File read failed');
      expect(responseData.message).to.include('File is empty');
    });

    it('should handle file parsing error from filePath', async () => {
      const fsStub = {
        readFile: sinon.stub().resolves('{ invalid json }'),
      };

      const controllerWithMockedFs = proxyquire('../../src/controllers/index', {
        '@moonactive/microservice-core': {
          Services: ServicesStub,
        },
        'fs/promises': fsStub,
      }).default;

      const req = {
        query: {
          filePath: 'examples/invalid.json',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await controllerWithMockedFs.api.v1.comparison['run-from-file'].post(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.error).to.equal('File read failed');
      expect(responseData.message).to.include('Failed to parse JSON file');
    });


    it('should handle error from comparison runner', async () => {
      const fileBuffer = Buffer.from(JSON.stringify({ teamIds: ['team1'] }));

      async function* fileParts() {
        yield {
          buffer: fileBuffer,
          mimetype: 'application/json',
        };
      }

      const req = {
        isMultipart: sinon.stub().returns(true),
        parts: fileParts,
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      const error = new Error('Comparison failed');
      (comparisonRunnerStub.runManualComparison as sinon.SinonStub).rejects(error);

      await controller.api.v1.comparison['run-from-file'].post(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.error).to.equal('Comparison failed');
      expect((loggerStub.error as sinon.SinonStub).calledOnce).to.be.true;
    });
  });
});
