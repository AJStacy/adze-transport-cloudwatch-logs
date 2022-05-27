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
  const args = data.args.map((arg) => JSON.stringify(arg));
  return {
    timestamp: data.timestamp.unixMilli,
    message: args.join(' '),
  };
}

/**
 * Returns the size of an object in bytes.
 */
export function getBytes(str: string): number {
  if (typeof window !== 'undefined') {
    return new window.Blob([str]).size;
  }
  return Buffer.from(str).length;
}

export function mapKey(groupName: string, streamName: string): string {
  return `${groupName}_${streamName}`;
}

export const log = adze().ns('adze-transport-cloudwatch-logs').seal();
