import { expect } from 'chai';
import sinon from 'sinon';
import ComparisonEngine from '../../../src/modules/comparison-engine/comparison-engine';
import { FetchResult } from '../../../src/modules/comparison-engine/types';

describe('ComparisonEngine', () => {
  let comparisonEngine: ComparisonEngine;
  let loggerMock: any;
  let params: any;

  beforeEach(() => {
    loggerMock = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    params = {
      services: {
        loggerManager: {
          getLogger: () => loggerMock,
        },
      },
    };

    comparisonEngine = new ComparisonEngine(params);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('compare', () => {
    it('should handle both message sets empty', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [],
        chatServiceMessages: [],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.metrics.coverage).to.equal(100);
      expect(result.metrics.chatMissingCount).to.equal(0);
      expect(result.metrics.pubnubMissingCount).to.equal(0);
      expect(result.details?.matchedCount).to.equal(0);
      expect(loggerMock.info.calledWith('No activity detected in either system')).to.be.true;
    });

    it('should handle pubnub having messages and chat being empty', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [{ timetoken: '1000' }, { timetoken: '2000' }],
        chatServiceMessages: [],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.metrics.coverage).to.equal(0);
      expect(result.metrics.chatMissingCount).to.equal(2);
      expect(result.metrics.pubnubMissingCount).to.equal(0);
      expect(result.details?.matchedCount).to.equal(0);
      expect(loggerMock.warn.calledWith('Total discrepancy: one system is empty')).to.be.true;
    });

    it('should handle chat having messages and pubnub being empty', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [],
        chatServiceMessages: [{ id: '1000' }],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.metrics.coverage).to.equal(100);
      expect(result.metrics.chatMissingCount).to.equal(0);
      expect(result.metrics.pubnubMissingCount).to.equal(1);
      expect(result.details?.matchedCount).to.equal(0);
      expect(loggerMock.warn.calledWith('Total discrepancy: one system is empty')).to.be.true;
    });

    it('should skip comparison if fetch failed', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [],
        chatServiceMessages: [],
        pubnubSuccess: false,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.skipped).to.be.true;
      expect(result.reason).to.equal('pubnub_failed');
      expect(loggerMock.warn.calledWith('Skipping comparison due to fetch failures')).to.be.true;
    });

    it('should perform a full comparison when both systems have messages', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [{ timetoken: '1000', message: { text: 'hello' } }],
        chatServiceMessages: [{ message: { id: '1000', content: { text: 'hello' } } }],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.details?.matchedCount).to.equal(1);
      expect(result.metrics.contentMismatchRate).to.equal(0);
      expect(loggerMock.info.calledWith('Comparison completed')).to.be.true;
    });

    it('should detect content mismatches during full comparison', async () => {
      const fetchResult: FetchResult = {
        teamId: 'team-1',
        channelId: 'channel-1',
        pubnubMessages: [{ timetoken: '1000', message: { text: 'hello' } }],
        chatServiceMessages: [{ message: { id: '1000', content: { text: 'world' } } }],
        pubnubSuccess: true,
        chatServiceSuccess: true,
      };

      const result = await comparisonEngine.compare(fetchResult);

      expect(result.details?.matchedCount).to.equal(1);
      expect(result.details?.contentMismatchCount).to.equal(1);
      expect(result.contentMismatches?.length).to.equal(1);
    });
  });
});
