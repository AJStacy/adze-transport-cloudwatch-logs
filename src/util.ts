import adze from 'adze';
import { FinalLogData, InputLogEvent } from './_contracts';

/**
 * Pauses execution for a specified period of time in milliseconds.
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
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

/**
 * Function for generating a map key from a log group name and log stream name.
 */
export function mapKey(logGroupName: string, logStreamName: string): string {
  return `${logGroupName}_${logStreamName}`;
}

export const log = adze().ns('adze-transport-cloudwatch-logs').seal();
