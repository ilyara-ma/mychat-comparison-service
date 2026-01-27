import { expect } from 'chai';
import sinon from 'sinon';
import { calculateTimeWindow } from '../../src/utils/time-window';

describe('calculateTimeWindow', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(new Date('2024-01-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    clock.restore();
  });

  it('should return zero timestamps when ignoreBuffer is true', () => {
    const result = calculateTimeWindow(15, 5, true);

    expect(result).to.deep.equal({
      fromTimestamp: 0,
      toTimestamp: 0,
    });
  });

  it('should calculate time window correctly when ignoreBuffer is false', () => {
    const result = calculateTimeWindow(15, 5, false);

    const expectedWindowMinutes = 15 + 5;
    const now = Date.now();
    const expectedFromTimestamp = Math.floor((now - (expectedWindowMinutes * 60 * 1000)) / 1000);
    const expectedToTimestamp = Math.floor(now / 1000);

    expect(result).to.deep.equal({
      fromTimestamp: expectedFromTimestamp,
      toTimestamp: expectedToTimestamp,
    });
  });

  it('should use default buffer minutes when not provided', () => {
    const result = calculateTimeWindow(15, 0, false);

    const expectedWindowMinutes = 15 + 5;
    const now = Date.now();
    const expectedFromTimestamp = Math.floor((now - (expectedWindowMinutes * 60 * 1000)) / 1000);
    const expectedToTimestamp = Math.floor(now / 1000);

    expect(result).to.deep.equal({
      fromTimestamp: expectedFromTimestamp,
      toTimestamp: expectedToTimestamp,
    });
  });

  it('should calculate correct time range for different intervals', () => {
    const result = calculateTimeWindow(30, 10, false);

    const expectedWindowMinutes = 30 + 10;
    const now = Date.now();
    const expectedFromTimestamp = Math.floor((now - (expectedWindowMinutes * 60 * 1000)) / 1000);
    const expectedToTimestamp = Math.floor(now / 1000);

    expect(result).to.deep.equal({
      fromTimestamp: expectedFromTimestamp,
      toTimestamp: expectedToTimestamp,
    });
  });

  it('should default to ignoreBuffer true when not specified', () => {
    const result = calculateTimeWindow(15, 5);

    expect(result).to.deep.equal({
      fromTimestamp: 0,
      toTimestamp: 0,
    });
  });
});
