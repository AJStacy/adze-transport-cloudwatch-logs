import {
  CloudWatchLogs,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { mapKey } from './util';
import { isResourceAlreadyExistsException } from './type-guards';

/**
 * Controls aspects of CloudWatch Logs groups and streams by tracking their
 * names and generating them with cloudwatch.
 */
export class GroupStream {
  /**
   * The private instance of CloudWatchLogs that is generated on construct.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * The log group name of which to add log events.
   */
  public readonly logGroupName: string;

  /**
   * Controls if this instance should attempt to create the
   * configured log group automatically.
   */
  private readonly createLogGroup: boolean;

  /**
   * The log stream name of which to add log events.
   */
  public readonly logStreamName: string;

  /**
   * Controls if this instance should attempt to create the
   * configured log stream automatically.
   */
  private readonly createLogStream: boolean;

  /**
   * Optional tags to be applied to the log group.
   */
  private readonly tags: Record<string, string> | undefined;

  /**
   * Tracks if the group and stream have been instantiated.
   */
  private uninstantiated = true;

  constructor(
    cloudwatch: CloudWatchLogs,
    logGroupName: string,
    createLogGroup: boolean,
    logStreamName: string,
    createLogStream: boolean,
    tags?: Record<string, string>
  ) {
    this.cloudwatch = cloudwatch;
    this.logGroupName = logGroupName;
    this.createLogGroup = createLogGroup;
    this.logStreamName = logStreamName;
    this.createLogStream = createLogStream;
    this.tags = tags;
  }

  //////////////////////////////////////////////
  // GETTERS AND SETTERS
  //////////////////////////////////////////////

  /**
   * Generates a key for tracking streams from the group name and stream name.
   */
  public get mapKey(): string {
    return mapKey(this.logGroupName, this.logStreamName);
  }

  //////////////////////////////////////////////
  // PUBLIC METHODS
  //////////////////////////////////////////////

  /**
   * Idempotently ensure that the configured group and stream exist.
   */
  public async instantiate(): Promise<void> {
    if (this.uninstantiated) {
      await this.makeLogGroup();
      await this.makeLogStream();
      this.uninstantiated = false;
    }
  }

  //////////////////////////////////////////////
  // PRIVATE METHODS
  //////////////////////////////////////////////

  /**
   * Attemps to create a new log group with the provided name. If the stream
   * already exists the response is ignored.
   */
  private async makeLogGroup(): Promise<void> {
    try {
      if (this.createLogGroup) {
        const { logGroupName, tags } = this;
        const command = new CreateLogGroupCommand({
          logGroupName,
          tags,
        });
        await this.cloudwatch.send(command);
      }
    } catch (e: unknown) {
      // If the thrown exception is a ResourceAlreadyExistsException, we should ignore it.
      if (isResourceAlreadyExistsException(e)) return;
      throw e;
    }
  }

  /**
   * Attempts to create a new log stream with the provided name. If the stream
   * already exists the response is ignored.
   */
  private async makeLogStream(): Promise<void> {
    try {
      if (this.createLogStream) {
        const { logGroupName, logStreamName } = this;
        const command = new CreateLogStreamCommand({
          logGroupName,
          logStreamName,
        });
        await this.cloudwatch.send(command);
      }
    } catch (e: unknown) {
      // If the thrown exception is a ResourceAlreadyExistsException, we should ignore it.
      if (isResourceAlreadyExistsException(e)) return;
      throw e;
    }
  }
}
