import { CloudWatchLogs, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { GroupStream } from './group-stream';
import { log } from './util';

export class SequenceToken {
  /**
   * The private instance of CloudWatchLogs that is generated on construct.
   */
  private cloudwatch: CloudWatchLogs;

  /**
   * Instance of the GroupStream class.
   */
  private groupStream: GroupStream;

  /**
   * The current sequence token string.
   */
  private sequenceToken: string | undefined;

  constructor(cloudwatch: CloudWatchLogs, groupStream: GroupStream) {
    this.cloudwatch = cloudwatch;
    this.groupStream = groupStream;
  }

  //////////////////////////////////////////////
  // PUBLIC METHODS
  //////////////////////////////////////////////

  /**
   * Gets the latest sequence token either from the private map
   * or from the API if it is not in the map.
   */
  public async get(): Promise<string | undefined> {
    // If we have a sequenceToken key/value pair, return it.
    if (typeof this.sequenceToken === 'undefined') {
      // Else, get a new token, set it on the map, and return the new token
      this.sequenceToken = await this.getLatestSequenceToken();
    }
    return this.sequenceToken;
  }

  /**
   * Sets the sequence token string.
   */
  public set(sequenceToken: string | undefined): void {
    this.sequenceToken = sequenceToken;
  }

  //////////////////////////////////////////////
  // PRIVATE METHODS
  //////////////////////////////////////////////

  /**
   * Gets the latest sequenceToken from CloudWatch for the provided
   * group name and stream name.
   */
  private async getLatestSequenceToken(): Promise<string | undefined> {
    const { logGroupName, logStreamName: logStreamNamePrefix } = this.groupStream;
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
  }
}
