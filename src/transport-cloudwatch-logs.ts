import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { isFinalLogData } from 'adze';
import { createLogEvent, mapKey } from './util';
import { DEFAULTS, STREAM_OPTIONS_DEFAULTS } from './constants';
import type {
  Configuration,
  CloudWatchLogsClientConfig,
  ListenerCallback,
  StreamOptions,
} from './_contracts';
import { CommandQueue } from './command-queue';
import { GroupStream } from './group-stream';

export class TransportCloudWatchLogs {
  /**
   * The private instance of CloudWatchLogs that is generated on construct.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * The user defined configuration for this instance.
   */
  private readonly config: Configuration;

  /**
   * Map of GroupStream instances.
   */
  private groupStreams: Map<string, GroupStream> = new Map();

  /**
   * Map of CommandQueue instances.
   */
  private commandQueues: Map<string, CommandQueue> = new Map();

  constructor(cloudwatchCfg: CloudWatchLogsClientConfig, cfg?: Partial<Configuration>) {
    this.cloudwatch = new CloudWatchLogs(cloudwatchCfg);
    this.config = { ...DEFAULTS, ...cfg };
  }

  //////////////////////////////////////////////
  // PUBLIC METHODS
  //////////////////////////////////////////////

  /**
   * Set the CloudWatch Logs client instance manually. This is mainly used for unit
   * testing purposes.
   */
  public setClient(client: CloudWatchLogs): void {
    this.cloudwatch = client;
  }

  /**
   * Generates an Adze ListenerCallback function to be provided to a log listener with Shed. This
   * generated callback will batch logs together based on the user configured batch size and store
   * them in an in-memory queue for later processing.
   */
  public stream(
    logGroupName: string,
    logStreamName: string,
    _streamOptions: Partial<StreamOptions> = STREAM_OPTIONS_DEFAULTS
  ): ListenerCallback {
    const streamOptions = { ..._streamOptions, ...STREAM_OPTIONS_DEFAULTS };
    const groupStream = this.instantiateGroupStream(logGroupName, logStreamName, streamOptions);
    const commandQueue = this.instantiateCommandQueue(groupStream, streamOptions);

    // Return our log listener callback
    return (data, _, printed) => {
      // Validate that this log can be streamed and that the data is finalized.
      if (this.canStream(printed) && isFinalLogData(data)) {
        const logEvent = createLogEvent(data);
        commandQueue.addEvent(logEvent);
      }
    };
  }

  /**
   * Kicks off an interval configured to the time provided in the user
   * configuration for the `rate` property. Each interval will attempt to
   * create a PutLogEvents Command and send it to AWS.
   */
  public processCommands(): void {
    for (const [_, commandQueue] of this.commandQueues) {
      commandQueue.process();
    }
  }

  /**
   * Stops the processing of the command queue.
   */
  public stopCommands(): void {
    for (const [_, commandQueue] of this.commandQueues) {
      commandQueue.stopProcessing();
    }
  }

  //////////////////////////////////////////////
  // PRIVATE METHODS
  //////////////////////////////////////////////

  /**
   * Returns a new GroupStream instance if one hasn't already been instantiated for the provided
   * group name and stream name. If it already exists, get the instance from the groupStream map
   * and return it instead.
   */
  private instantiateGroupStream(
    logGroupName: string,
    logStreamName: string,
    streamOptions: StreamOptions
  ): GroupStream {
    const key = mapKey(logGroupName, logStreamName);
    if (this.groupStreams.has(key)) {
      // Coerce the map get value to not be undefined because we checked if it exists already
      return this.groupStreams.get(key) as GroupStream;
    }
    const groupStream = new GroupStream(
      this.cloudwatch,
      logGroupName,
      this.config.createLogGroup,
      logStreamName,
      this.config.createLogStream,
      streamOptions.groupTags
    );
    this.groupStreams.set(key, groupStream);
    return groupStream;
  }

  /**
   * Returns a new CommandQueue instance if one hasn't already been instantiated for the provided
   * group name and stream name. If it already exists, get the instance from the commandQueues map
   * and return it instead.
   */
  private instantiateCommandQueue(
    groupStream: GroupStream,
    streamOptions: StreamOptions
  ): CommandQueue {
    if (this.commandQueues.has(groupStream.mapKey)) {
      // Coerce the map get value to not be undefined because we checked if it exists already
      return this.commandQueues.get(groupStream.mapKey) as CommandQueue;
    }
    const commandQueue = new CommandQueue(
      this.cloudwatch,
      groupStream,
      this.config.batchSize,
      this.config.rate,
      this.config.retries,
      streamOptions
    );
    this.commandQueues.set(groupStream.mapKey, commandQueue);
    return commandQueue;
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
}
