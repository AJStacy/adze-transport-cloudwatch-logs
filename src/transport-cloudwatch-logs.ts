import {
  CloudWatchLogs,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { delay, log } from './util';
import { DEFAULTS } from './constants';
import type {
  Configuration,
  ConfigurationDefaults,
  CommandData,
  SequenceTokenMap,
  CloudWatchLogsClientConfig,
  InputLogEvent,
  ListenerCallback,
} from './_contracts';

// If a command fails, cache it to localStorage for later retry.
// Expose a method for kicking off retrying any commands that exist in localStorage.
//   - This method loads them into memory once, then begins retrying.
//     - If successful, it deletes it from localStorage.

export class TransportCloudwatchLogs {
  /**
   * The private instance of CloudWatchLogs that is generated on construct.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * The user defined configuration for this instance.
   */
  private readonly config: ConfigurationDefaults;

  /**
   * Map of the latest sequence tokens.
   */
  private sequenceToken: SequenceTokenMap = new Map();

  /**
   * Queue of command data used for generating CloudWatch Log Input commands.
   */
  private commandQueue: CommandData[] = [];

  constructor(cloudwatchCfg: CloudWatchLogsClientConfig, cfg?: Configuration) {
    this.cloudwatch = new CloudWatchLogs(cloudwatchCfg);
    this.config = { ...DEFAULTS, ...cfg };
    // Check if we have any log commands in the localStorage cache and load them into memory.
    // Start processing the command queue at the configured rate.
    this.processCommandQueue();
  }

  /**
   * Loads failed commands from localStorage into the command queue
   * so we can reattempt sending them. Returns the number of failed
   * commands that were loaded.
   */
  public loadCached(): number {
    // TODO: load from localStorage into the command Queue
    // Check if a queue has been kicked off.
    return 0;
  }

  /**
   * Generates an Adze ListenerCallback function to be provided to a log listener with Shed. This
   * generated callback will batch logs together based on the user configured batch size and store
   * them in an in-memory queue for later processing.
   */
  public stream(logGroupName: string, logStreamName: string): ListenerCallback {
    const logEvents: InputLogEvent[] = [];
    let batchSize = 0;
    return (data, render, printed) => {
      // Check if a render was generated
      if (render) {
        // If transportHiddenLogs is enabled ignore printed, otherwise we should check printed
        if (this.config.transportHiddenLogs === true || printed) {
          // Validate that a timestamp and args exist on the log data
          if (data.timestamp?.unixMilli && data.args) {
            const message: string = data.args.join('');
            const log: InputLogEvent = {
              timestamp: data.timestamp.unixMilli,
              message,
            };

            // Get the size of the log message in bytes
            const messageSize = new Blob([message]).size;

            // Check if the current batchSize plus the messageSize is less than the allowed batchSize
            if (batchSize + messageSize < this.config.batchSize) {
              batchSize += messageSize;
              logEvents.push(log);
            } else {
              // Else create a command and add it to the command queue
              this.commandQueue.push({
                logEvents,
                logGroupName,
                logStreamName,
              });
            }
          }
        }
      }
    };
  }

  /**
   * Kicks off an interval configured to the time provided in the user
   * configuration for the `rate` property. Each interval will attempt to
   * create a
   */
  private async processCommandQueue() {
    try {
      delay(async () => {
        this.sendNextCommand();
      }, this.config.rate);
    } catch (e) {
      log().error('An error occurred while processing a command at the interval.', e);
    }
  }

  /**
   * This method first checks if it has a valid sequenceToken for the log stream specified
   * by the user and attempts to get the most recent if it doesn't exist. It then generates a
   * PutLogEventsCommand from the command data in the queue and then sends it using the
   * private CloudWatchLogs client instance. It then tries to update the sequence token
   * for the next request.
   */
  private async sendNextCommand() {
    try {
      // Make sure we have a command to send
      if (this.commandQueue.length > 0) {
        // The data for the command to be created.
        const data = this.commandQueue[0];

        const mapKey = `${data.logGroupName}_${data.logStreamName}`;
        // Check if we have the latest sequence token
        if (this.sequenceToken.has(mapKey)) {
          this.sequenceToken.set(
            mapKey,
            await this.getLatestSequenceToken(data.logGroupName, data.logStreamName)
          );
        }
        const command = new PutLogEventsCommand({
          ...this.commandQueue[0],
          sequenceToken: this.sequenceToken.get(mapKey) ?? undefined,
        });
        const res = await this.cloudwatch.send(command);
        if (res.nextSequenceToken) {
          this.sequenceToken.set(mapKey, res.nextSequenceToken);
        }
        this.commandQueue.shift();
      }
    } catch (e) {
      log().error('Failed to send a batch of logs.', e);
    }
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
    const command = new DescribeLogStreamsCommand({ logGroupName, logStreamNamePrefix });
    const response = await this.cloudwatch.send(command);
    if (response.logStreams) {
      // Search the returned log streams for the log
      const discoveredStream = response.logStreams.find(
        (stream) => stream.logStreamName === logStreamNamePrefix
      );

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
