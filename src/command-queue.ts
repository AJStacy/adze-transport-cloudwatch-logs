import { CloudWatchLogs, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { GroupStream } from './group-stream';
import { SequenceToken } from './sequence-token';
import { isDataAlreadyAcceptedException, isInvalidSequenceTokenException } from './type-guards';
import { log, getBytes, delay } from './util';
import type { CommandData, InputLogEvent, StreamOptions } from './_contracts';

export class CommandQueue {
  /**
   * Instance of the CloudWatchLogs class.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * Instance of the GroupStream class.
   */
  private groupStream: GroupStream;

  /**
   * Instance of the SequenceToken class.
   */
  private sequenceToken: SequenceToken;

  /**
   * The current log event batch size.
   */
  private readonly maxBatchSize: number;

  /**
   * The minimum interval of time between sending batches of commands.
   */
  private readonly rate: number;

  /**
   * The number of retries to attempt for a command.
   */
  private readonly retries: number;

  /**
   * The log stream options.
   */
  private readonly streamOptions: StreamOptions;

  /**
   * Queue of command data used for generating CloudWatch Log Input commands.
   */
  private commandQueue: CommandData[] = [];

  /**
   * The maximum size in bytes for each batch of log input events.
   */
  private batchSize = 0;

  /**
   * Collection of input log events.
   */
  private logEvents: InputLogEvent[] = [];

  /**
   * ID for the current delay timeout.
   */
  private timeoutId: unknown;

  constructor(
    cloudwatch: CloudWatchLogs,
    groupStream: GroupStream,
    maxBatchSize: number,
    rate: number,
    commandsPerTick: number,
    retries: number,
    streamOptions: StreamOptions
  ) {
    this.cloudwatch = cloudwatch;
    this.groupStream = groupStream;
    this.sequenceToken = new SequenceToken(this.cloudwatch, groupStream);
    this.maxBatchSize = maxBatchSize;
    this.rate = rate;
    this.retries = retries;
    this.streamOptions = streamOptions;
  }

  //////////////////////////////////////////////
  // GETTERS AND SETTERS
  //////////////////////////////////////////////

  /**
   * Gets a chunk of commands up to the configured rate limit.
   */
  private get nextCommand(): CommandData | undefined {
    if (this.commandQueue.length > 0) {
      return this.commandQueue.shift();
    }
  }

  //////////////////////////////////////////////
  // PUBLIC METHODS
  //////////////////////////////////////////////

  public addEvent(event: InputLogEvent): void {
    // Get the size of the log message in bytes
    const eventSize = getBytes(JSON.stringify(event));

    // Check if the current batchSize plus the messageSize is less than the allowed batchSize
    if (this.batchSize + eventSize < this.maxBatchSize) {
      this.batchSize += eventSize;
      this.logEvents.push(event);
    } else {
      // Reset the batch size tracker to 0
      this.batchSize = 0;
      // Else create a command and add it to the command queue
      this.createCommand();
    }
  }

  /**
   * Kicks off an interval configured to the time provided in the user
   * configuration for the `rate` property. Each interval will attempt to
   * create a PutLogEvents Command and send it to AWS.
   */
  public async process(): Promise<void> {
    // Get our next chunk of commands
    const command = this.nextCommand;
    let waitTime = this.rate;
    if (command) {
      // Take timestamp before
      const before = Date.now();
      // Fire events and await them
      await this.processCommand(command);
      // Take timestamp after
      const after = Date.now();
      // Subtract before from after
      waitTime = waitTime - (after - before);
    }

    // Set a timeout for the difference
    this.timeoutId = setTimeout(() => {
      // Process the next chunk
      this.process();
    }, waitTime);
  }

  /**
   * Stops the processing of the command queue.
   */
  public stopProcessing(): void {
    const id = this.timeoutId as number;
    clearTimeout(id);
  }

  //////////////////////////////////////////////
  // PRIVATE METHODS
  //////////////////////////////////////////////

  /**
   * Creates a new command that includes the current log events and adds it
   * to the queue for processing.
   */
  private createCommand(): void {
    const { logGroupName, logStreamName } = this.groupStream;
    const { logEvents, streamOptions } = this;
    this.commandQueue.push({
      logEvents,
      logGroupName,
      logStreamName,
      streamOptions,
    });
  }

  /**
   * Process a single command with the AWS SDK for CloudWatch.
   */
  private async processCommand(data: CommandData, retries = 1) {
    try {
      await this.sendLogEvents(data);
    } catch (e: unknown) {
      if (isDataAlreadyAcceptedException(e) || isInvalidSequenceTokenException(e)) {
        log().warn('The sequence token is likely incorrect. Retrying...');
        this.sequenceToken.set(e.expectedSequenceToken);

        if (retries <= this.retries) {
          retries++;
          await delay(this.rate * retries);
          await this.processCommand(data, retries);
        } else {
          data.streamOptions.failureCb(data, e);
        }
      } else {
        log().error('An error occurred while processing a command: ', e);
      }
    }
  }

  /**
   * This method first checks if it has a valid sequenceToken for the log stream specified
   * by the user and attempts to get the most recent if it doesn't exist. It then generates a
   * PutLogEventsCommand from the command data in the queue and then sends it using the
   * private CloudWatchLogs client instance. It then tries to update the sequence token
   * for the next request.
   */
  private async sendLogEvents(data: CommandData): Promise<void> {
    const { logGroupName, logStreamName, logEvents } = data;
    const sequenceToken = await this.sequenceToken.get();

    const command = new PutLogEventsCommand({
      logEvents,
      logGroupName,
      logStreamName,
      sequenceToken,
    });
    const res = await this.cloudwatch.send(command);
    this.sequenceToken.set(res.nextSequenceToken);

    // Fire the success callback
    data.streamOptions.successCb(data, res);
  }
}
