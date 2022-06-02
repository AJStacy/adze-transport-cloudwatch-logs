/**********************************************************\
 * This file is strictly used for testing and demonstrating
 * the add-on's API and features. This is not a part of the
 * source code of the add-on. To use this demo, you must
 * create a keys.ts file inside of your `src` folder that
 * contains the aws region ID, the access key, and the
 * secret key.
 * 
 * To execute this use `npm run demo`.
\**********************************************************/
import adze, { createShed } from 'adze';
import TransportCloudwatchLogs from '.';
import { region, accessKeyId, secretAccessKey } from './keys';

const client = new TransportCloudwatchLogs(
  {
    region,
    credentials: { accessKeyId, secretAccessKey },
  },
  { createLogGroup: true, createLogStream: true }
);

const shed = createShed();

shed.addListener(
  [1],
  client.stream('web-application', 'errors', {
    failureCb: (data, error) => {
      adze().fail('DATA', data);
      adze().error(error);
    },
    successCb: (data, response) => {
      adze().success('DATA', data);
      adze().success('RESPONSE', response);
    },
  })
);

shed.addListener(
  [2],
  client.stream('web-application', 'errors', {
    failureCb: (data, error) => {
      adze().fail('DATA', data);
      adze().error(error);
    },
    successCb: (data, response) => {
      adze().success('DATA', data);
      adze().success('RESPONSE', response);
    },
  })
);

shed.addListener(
  [0],
  client.stream('web-application', 'new-errors', {
    failureCb: (data, error) => {
      adze().fail('DATA', data);
      adze().error(error);
    },
    successCb: (data, response) => {
      adze().success('DATA', data);
      adze().success('RESPONSE', response);
    },
    groupTags: {
      foo: 'bar',
    },
  })
);

// Start processing commands
client.processCommands();

const logger = adze().seal();

for (let i = 0; i < 500; i++) {
  logger().error('Foo bar!', { x: 'foo', y: 'bar' }, [1, 2, 3]);
  logger().warn('WARNING!', 1234);
  logger().alert('This error is silent.');
}
