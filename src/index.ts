import adze, { createShed } from 'adze';
import {
  CloudWatchLogs,
  PutLogEventsCommand,
  InputLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';
import { region, accessKeyId, secretAccessKey } from '../keys';
import { TransportCloudwatchLogs } from './transport-cloudwatch-logs';

// 5 requests per second per log stream
const MAX_BATCH_SIZE = 1000000; // bytes
const MAX_EVENTS = 10000;

const clwClient = new CloudWatchLogs({ region, credentials: { accessKeyId, secretAccessKey } });

const shed = createShed();

const cloudwatchLogs = new TransportCloudwatchLogs({ region, accessKeyId, secretAccessKey });

shed.addListener('*', cloudwatchLogs.stream(''))

shed.addListener([0, 1], (data, render, printed) => {
  if (render && printed) {
    const [_, args] = render;
    const json = args[0] as string;
    const log: InputLogEvent = {
      timestamp: data.timestamp?.unixMilli,
      message: json,
    };

    const command = new PutLogEventsCommand({
      logEvents: [log],
      logGroupName: 'web-application',
      logStreamName: 'errors',
      sequenceToken: '49626002093467560782504674639842760700802361318547915090',
    });

    clwClient.send(command).then(console.log);
  }
});

const logger = adze({ machineReadable: true }).seal();

logger().error('Foo bar!');

