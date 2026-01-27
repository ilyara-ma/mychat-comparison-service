import { TimeWindow } from '../types';

export function calculateTimeWindow(
  pollingIntervalMinutes: number,
  bufferMinutes: number,
  ignoreBuffer: boolean = true,
): TimeWindow {
  if (ignoreBuffer) {
    return { fromTimestamp: 0, toTimestamp: 0 };
  }
  const now = Date.now();
  const windowMinutes = pollingIntervalMinutes + (bufferMinutes || 5);
  const fromTimestamp = Math.floor((now - (windowMinutes * 60 * 1000)) / 1000);
  const toTimestamp = Math.floor(now / 1000);

  return { fromTimestamp, toTimestamp };
}
