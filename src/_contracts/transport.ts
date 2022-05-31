import type { InputLogEvent, PutLogEventsCommandOutput } from '.';

/**
 * Configuration for handling transportation of your application
 * logs to AWS CloudWatch Logs.
 *
 * @param batchSize The maximum amount of bytes to be sent in a single batch. Default is 1000000.
 * @param transportHiddenLogs Should we send logs to CloudWatch that did not print to the console? Default is false.
 * @param rate The rate at which to send commands to CloudWatch Logs.
 * @param retries Number of times to retry sending a command if it fails.
 * @param createLogGroup When enabled, creates a log group if it doesn't already exist.
 * @param createLogStream When enabled, creates a log stream if it doesn't already exist.
 */
export interface Configuration {
  batchSize: number;
  transportHiddenLogs: boolean;
  rate: number;
  retries: number;
  createLogGroup: boolean;
  createLogStream: boolean;
}

/**
 * Callback when a command has been successfully sent.
 */
export type SuccessCallback = (data: CommandData, response: PutLogEventsCommandOutput) => void;

/**
 * Callback when a command has failed to send.
 */
export type FailureCallback = (data: CommandData, error: unknown) => void;

/**
 * Options for the specified stream.
 *
 * @param successCb Callback when a command has been successfully sent.
 * @param failureCb Callback when a command has failed to send.
 * @param logGroupTags Tags that you would like applied to new log groups.
 * @param logStreamTags Tags that you would like applied to new log streams.
 */
export interface StreamOptions {
  successCb: SuccessCallback;
  failureCb: FailureCallback;
  groupTags?: Record<string, string>;
}

/**
 * Data for building a command from a set of log events.
 */
export interface CommandData {
  logEvents: InputLogEvent[];
  logGroupName: string;
  logStreamName: string;
  streamOptions: StreamOptions;
}
