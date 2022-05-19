import type { InputLogEvent } from '.';

/**
 * Configuration for handling transportation of your application
 * logs to AWS CloudWatch Logs.
 *
 * @param batchSize The maximum amount of bytes to be sent in a single batch. Default is 1000000.
 * @param transportHiddenLogs Should we send logs to CloudWatch that did not print to the console? Default is false.
 * @param rate The rate at which to send commands to CloudWatch Logs.
 * @param localStorageLocation The filepath where local storage data will be written in node environments.
 */
export interface ConfigurationDefaults {
  batchSize: number;
  transportHiddenLogs: boolean;
  rate: number;
  localStorageLocation: string;
}

export interface Configuration extends Partial<ConfigurationDefaults> {}

export interface CommandData {
  logEvents: InputLogEvent[];
  logGroupName: string;
  logStreamName: string;
}

export interface SequenceTokenMap extends Map<string, string | null> {}
