import adze from 'adze';
import { FinalLogData, InputLogEvent } from './_contracts';

export function delay<T>(cb: () => Promise<any>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    setInterval(() => {
      cb().then(resolve).catch(reject);
    }, ms);
  });
}

/**
 * Validates that the log data is valid and builds a command data object from it.
 */
export function createLogEvent(data: FinalLogData<any>): InputLogEvent {
  return {
    timestamp: data.timestamp.unixMilli,
    message: data.args.join(''),
  };
}

/**
 * Returns the size of an object in bytes.
 */
export function getObjectBytes(obj: Record<string, unknown>): number {
  return new Blob([JSON.stringify(obj)]).size;
}

export const log = adze().ns('adze-transport-cloudwatch-logs').seal();
