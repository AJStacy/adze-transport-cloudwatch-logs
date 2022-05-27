import adze, { createShed } from 'adze';
import TransportCloudwatchLogs from '.';
import { region, accessKeyId, secretAccessKey } from './keys';

const client = new TransportCloudwatchLogs({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

const shed = createShed();

shed.addListener(
  [0, 1],
  client.stream(
    'web-application',
    'errors',
    (data, error) => {
      adze().fail('DATA', data);
      adze().error(error);
    },
    (data, response) => {
      adze().success('DATA', data);
      adze().success('RESPONSE', response);
    }
  )
);

const logger = adze().seal();

for (let i = 0; i < 500; i++) {
  logger().error('Foo bar!', { x: 'foo', y: 'bar' }, [1, 2, 3]);
  logger().silent.error('This error is silent.');
}
