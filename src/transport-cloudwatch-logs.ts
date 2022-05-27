/* eslint-disable  */
import {
  CloudWatchLogs,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import adze, { isFinalLogData } from 'adze';
import { delay, log, createLogEvent, getBytes, mapKey } from './util';
import { SequenceTokenError } from './errors';
import { DEFAULTS } from './constants';
import type {
  Configuration,
  CommandData,
  CloudWatchLogsClientConfig,
  InputLogEvent,
  ListenerCallback,
  SuccessCallback,
  FailureCallback,
} from './_contracts';

export class TransportCloudwatchLogs {
  /**
   * The private instance of CloudWatchLogs that is generated on construct.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * The user defined configuration for this instance.
   */
  private readonly config: Configuration;

  /**
   * Map of the latest sequence tokens.
   */
  private sequenceToken: Map<string, string | undefined> = new Map();

  /**
   * Queue of command data used for generating CloudWatch Log Input commands.
   */
  private commandQueue: CommandData[] = [];

  constructor(cloudwatchCfg: CloudWatchLogsClientConfig, cfg?: Partial<Configuration>) {
    this.cloudwatch = new CloudWatchLogs(cloudwatchCfg);
    this.config = { ...DEFAULTS, ...cfg };
    // Check if we have any log commands in the localStorage cache and load them into memory.
    // Start processing the command queue at the configured rate.
    this.processCommandQueue();
  }

  /**
   * Returns the latest command from the queue.
   */
  private get latestCommand(): CommandData | null {
    return this.commandQueue[0] ?? null;
  }

  /**
   * Queue up command data to be posted to CloudWatch Logs.
   */
  public loadCommandData(data: CommandData[]): void {
    this.commandQueue = this.commandQueue.concat(data);
  }

  /**
   * Generates an Adze ListenerCallback function to be provided to a log listener with Shed. This
   * generated callback will batch logs together based on the user configured batch size and store
   * them in an in-memory queue for later processing.
   */
  public stream(
    logGroupName: string,
    logStreamName: string,
    failureCb: FailureCallback = () => { },
    successCb: SuccessCallback = () => { }
  ): ListenerCallback {
    const logEvents: InputLogEvent[] = [];
    let batchSize = 0;
    return (data, render, printed) => {
      // Validate that this log can be streamed and that the data is finalized.
      if (this.canStream(printed) && isFinalLogData(data)) {
        const logEvent = createLogEvent(data);

        // Get the size of the log message in bytes
        const eventSize = getBytes(JSON.stringify(logEvent));

        // Check if the current batchSize plus the messageSize is less than the allowed batchSize
        if (batchSize + eventSize < this.config.batchSize) {
          batchSize += eventSize;
          logEvents.push(logEvent);
        } else {
          // Reset the batch size tracker to 0
          batchSize = 0;
          // Else create a command and add it to the command queue
          this.commandQueue.push({
            logEvents,
            logGroupName,
            logStreamName,
            failureCb,
            successCb,
          });
        }
      }
    };
  }

  /**
   * Validate that a log is allowed to be streamed to CloudWatch by checking if
   * it has a log render and transportHiddenLogs is enabled or the log was printed
   * if it isn't.
   */
  private canStream(printed: boolean): boolean {
    if (this.config.transportHiddenLogs) {
      return true;
    }
    return printed;
  }

  /**
   * Kicks off an interval configured to the time provided in the user
   * configuration for the `rate` property. Each interval will attempt to
   * create a PutLogEvents Command and send it to AWS.
   */
  private async processCommandQueue(retries = 0) {
    delay(async () => {
      const data = this.latestCommand;
      try {
        adze().debug('Interval firing!', data);
        if (data) {
          adze().debug('Attempting to send a command.', data);
          this.sendCommand(data);
        }
      } catch (e) {
        log().error('An error occurred while processing a command at the interval.', e);
        // Add to the command cache
        // Retry for IntervalServiceFault, InvalidNextToken, "Failed to fetch"
        if (retries < this.config.retries) {
          log().debug(`Retry attempt #${retries}...`);
          await this.processCommandQueue(retries++);
        } else {
          data?.failureCb(data, e);
        }
      }
    }, this.config.rate);
  }

  /**
   * This method first checks if it has a valid sequenceToken for the log stream specified
   * by the user and attempts to get the most recent if it doesn't exist. It then generates a
   * PutLogEventsCommand from the command data in the queue and then sends it using the
   * private CloudWatchLogs client instance. It then tries to update the sequence token
   * for the next request.
   */
  private async sendCommand(data: CommandData) {
    const { logGroupName, logStreamName } = data;
    const key = mapKey(logGroupName, logStreamName);
    const sequenceToken = await this.getSequenceToken(key, logGroupName, logStreamName);

    const command = new PutLogEventsCommand({
      ...data,
      sequenceToken,
    });
    const res = await this.cloudwatch.send(command);

    // Set the next sequence token from the response
    if (res.nextSequenceToken) {
      this.setSequenceToken(key, res.nextSequenceToken);
    }
    this.commandQueue.shift();

    // Fire the success callback
    data.successCb(data, res);
  }

  /**
   * Gets the latest sequence token either from the private map
   * or from the API if it is not in the map.
   */
  private async getSequenceToken(
    key: string,
    logGroupName: string,
    logStreamName: string
  ): Promise<string | undefined> {
    // If we have a sequenceToken key/value pair, return it.
    if (this.sequenceToken.has(key)) {
      const token = this.sequenceToken.get(key);
      if (token) {
        return token;
      }
    }
    // Else, get a new token, set it on the map, and return the new token
    const newToken = await this.getLatestSequenceToken(logGroupName, logStreamName);
    if (newToken) {
      this.sequenceToken.set(key, newToken);
      return newToken;
    } else {
      throw new SequenceTokenError(
        'Failed to get the next sequence token for the log event command.'
      );
    }
  }

  /**
   * Sets the next sequence token to the tracking map.
   */
  private setSequenceToken(key: string, token: string): void {
    this.sequenceToken.set(key, token);
  }

  /**
   * Gets the latest sequenceToken from CloudWatch for the provided
   * group name and stream name.
   */
  private async getLatestSequenceToken(
    logGroupName: string,
    logStreamName: string
  ): Promise<string | null> {
    const logStreamNamePrefix = logStreamName;
    adze().debug('logStreamNamePrefix', logStreamNamePrefix);
    const command = new DescribeLogStreamsCommand({ logGroupName, logStreamNamePrefix });
    const response = await this.cloudwatch.send(command);
    adze().debug('CloudWatch response', response.logStreams);
    if (response.logStreams) {
      // Search the returned log streams for the log
      const discoveredStream = response.logStreams.find(
        (stream) => stream.logStreamName === logStreamNamePrefix
      );
      adze().success('Found the log stream!', discoveredStream);

      if (discoveredStream?.uploadSequenceToken) {
        return discoveredStream.uploadSequenceToken;
      }
    }
    log().warn(
      'Failed to get the latest sequence token for the provided stream name. Check that the group name and stream name provided are spelled correctly.'
    );
    return null;
  }
}