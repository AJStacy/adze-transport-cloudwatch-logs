// import { createShed, removeShed } from 'adze';
// import { Shed } from 'adze/dist/shed';
// import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import test from 'ava';
// import { mockClient, AwsStub } from 'aws-sdk-client-mock';
// import TransportCloudwatchLogs from '../src';

// const test = anyTest as TestInterface<{
//   shed: Shed;
//   cloudwatchMock: AwsStub<any, any>;
//   client: TransportCloudwatchLogs;
// }>;

// test.beforeEach((t) => {
//   // Create our global Adze shed for unit testing purposes
//   const shed = createShed();
//   // Create our CloudWatchLogs configuration.
//   const config = {
//     region: 'us-east-2',
//     credentials: {
//       accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
//       secretAccessKey: 'XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
//     },
//   };
//   // Make our mock
//   const cloudwatch = new CloudWatchLogs(config);
//   const cloudwatchMock = mockClient(cloudwatch);
//   // Make our Transport instance and set our mock client
//   const client = new TransportCloudwatchLogs(config);
//   // Set our custom CloudWatchLogs instance to the Transport
//   client.setClient(cloudwatch);

//   t.context.shed = shed;
//   t.context.client = client;
//   t.context.cloudwatchMock = cloudwatchMock;
// });

// test.afterEach((t) => {
//   // Reset our Mock
//   t.context.cloudwatchMock.reset();
//   // Clear the global context by tearing down the shed
//   removeShed();
// });

// {
//   '$metadata': {
//     httpStatusCode: 200,
//     requestId: 'ee613823-ee50-4df5-9e4a-3223916970d3',
//     extendedRequestId: undefined,
//     cfId: undefined,
//     attempts: 1,
//     totalRetryDelay: 0
//   },
//   nextSequenceToken: '49616430786637532689282674776100031722748385446917570866',
//   rejectedLogEventsInfo: undefined
// }

test.serial('stream generates commands in the command queue', (t) => {
  t.pass();
  // const { shed, client, cloudwatchMock } = t.context;
  // shed.addListener([0, 1], client.stream('foo', 'bar'));

  // // Start the command queue
  // client.processCommands();

  // adze().log('hello world!');
  // adze().log('foo bar');

  // cloudwatchMock
  //   .on(PutLogEventsCommand)
  //   .resolvesOnce({
  //     $metadata: {
  //       httpStatusCode: 200,
  //       requestId: 'ee613823-ee50-4df5-9e4a-3223916970d3',
  //       extendedRequestId: undefined,
  //       cfId: undefined,
  //       attempts: 1,
  //       totalRetryDelay: 0,
  //     },
  //     nextSequenceToken: '49616430786637532689282674776100031722748385446917570866',
  //     rejectedLogEventsInfo: undefined,
  //   })
  //   .resolvesOnce({
  //     $metadata: {
  //       httpStatusCode: 200,
  //       requestId: 'ee613823-ee50-4df5-9e4a-3223916970d3',
  //       extendedRequestId: undefined,
  //       cfId: undefined,
  //       attempts: 1,
  //       totalRetryDelay: 0,
  //     },
  //     nextSequenceToken: '49616430786637532689282674776100031722748385446917570867',
  //     rejectedLogEventsInfo: undefined,
  //   });

  // t.is(cloudwatchMock.calls().length, 2);
  // console.log(cloudwatchMock.call(0).args[0].input);
});
