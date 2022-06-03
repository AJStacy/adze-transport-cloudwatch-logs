# adze-transport-cloudwatch-logs

> This add-on is in its infancy and may not be completely stable. Please open issues and contribute!

This library is an add-on for transporting logs to AWS Cloudwatch Logs via [Adze](https://adzejs.com) [log listeners](https://adzejs.com/guide/shed-concepts.html#listeners).

For API Documentation for CloudWatch Logs, please visit [https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch-logs/index.html](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch-logs/index.html).

## Minimum Requirements

**browser** - ES6 Support Recommended
**node** - `12.x`, `14.x` (recommended minimum), `16.x`, and `18.x`.
**adze** - `v1.9.0` recommended (peer dependency)

## Install

```bash
# install with npm
npm install -S adze-transport-cloudwatch-logs

# install with pnpm
pnpm install -S adze-transport-cloudwatch-logs

# install with yarn
yarn add adze-transport-cloudwatch-logs
```

## Quick Start

As with any [Adze](https://adzejs.com) add-on, it takes advantage of log listeners by returning a log listener callback function for you to handle your logs. This allows you as the user to specify which log levels you would like the add-on to watch.

Here is a basic example of setting up a CloudWatch Logs transport that listens for alerts and errors.

```javascript
import adze, { createShed } from 'adze';
import TransportCloudWatchLogs from 'adze-transport-cloudwatch-logs';

// First, create a new instance of the transport and provide it with CloudWatch Logs credentials.
const client = new TransportCloudWatchLogs(
  {
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
      secretAccessKey: 'XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
    },
  }
);

// Create our Shed
const shed = createShed();

// Add our log listener for alert and error level logs to be transported
shed.addListener([0, 1], client.stream('my-group', 'errors'));

// Kick off our command queue to begin sending the logs to cloudwatch
client.processCommands();

adze().alert('This log will be transported to CloudWatch Logs.');
```

## Configuration

This transport allows two configuration objects in the constructor. The first parameter configures the underlying [AWS CloudWatchLogs client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch-logs/index.html). The second parameter configures the transport.

### Transport Configuration Interface

```javascript
/**
 * Configuration for handling transportation of your application
 * logs to AWS CloudWatch Logs.
 *
 * @param batchSize The maximum amount of bytes to be sent in a single batch. Default is 1000000.
 * @param transportHiddenLogs Should we send logs to CloudWatch that did not print to the console? Default is false.
 * @param rate The rate at which to send commands to CloudWatch Logs. Default is 1000 (ms).
 * @param retries Number of times to retry sending a command if it fails. Default is 3.
 * @param createLogGroup When enabled, creates a log group automatically if it doesn't already exist. Default is false.
 * @param createLogStream When enabled, creates a log stream automatically if it doesn't already exist. Default is false.
 */
export interface Configuration {
  batchSize: number;
  transportHiddenLogs: boolean;
  rate: number;
  retries: number;
  createLogGroup: boolean;
  createLogStream: boolean;
}
```

## Methods

The transport exposes a handful of methods for streaming log events and controlling the flow of the transport of logs to AWS CloudWatch.

### stream

This method generates a callback function for an Adze log listener. This callback function captures logs, creates a CloudWatch Logs event, and sets them to a queue to be processed in the background of your application. You can create as many streams as you want as well as create duplicates.

#### stream Example

```javascript
// Create our Shed
const shed = createShed();

// Add our log listener for alert and error level logs to be transported
shed.addListener([1], client.stream('my-group', 'errors'));

// Let's also create a stream for warning and info logs.
shed.addListener([2, 3], client.stream('my-group', 'warnings-info'));

// We can also create multiple listeners for the same stream. Here we will add alerts to our 'errors' stream.
shed.addListener([0], client.stream('my-group', 'errors'));
```

---

### processCommands

This method kicks off an interval in the background that will periodically send log event commands that have been queued to CloudWatch Logs. Logs will **not** be sent to CloudWatch Logs unless this method is called within your application.

#### processCommands Example

```javascript
// Create our Shed
const shed = createShed();

// Add our log listener for alert and error level logs to be transported
shed.addListener([0, 1], client.stream('my-group', 'errors'));

// Kick off our command queue to begin sending the logs to cloudwatch
client.processCommands();
```

---

### stopCommands

This method stops all command queues from processing log events and sending them to CloudWatch Logs.

#### stopCommands Example

```javascript
// Create our Shed
const shed = createShed();

// Add our log listener for alert and error level logs to be transported
shed.addListener([0, 1], client.stream('my-group', 'errors'));

// Kick off our command queue to begin sending the logs to cloudwatch
client.processCommands();

adze().log('Writing my logs...');

// Later...
client.stopCommands();
```

---

### setClient

This method allows you to set your own instance of the CloudWatch Logs client into the transport. You will normally not need to do this as the transport creates its own instance by default (this is primarily used for unit testing).

#### setClient Example

```javascript
import adze, { createShed } from 'adze';
import TransportCloudWatchLogs from 'adze-transport-cloudwatch-logs';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';

// Create our CloudWatch Logs configuration.
const config = {
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
    secretAccessKey: 'XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  },
};

// First, create a new instance of the transport and provide it with CloudWatch Logs credentials.
const client = new TransportCloudWatchLogs(config);

// Create our own instance of CloudWatchLogs
const cloudwatch = new CloudWatchLogs(config);

// Set our own instance of CloudWatchLogs as the instance to be used by TransportCloudWatchLogs
client.setClient(cloudwatch);
```

---

## Stream Hooks

When creating a stream you can provide a configuration object that contains callback functions for hooking into successful log event commands and for handling failed log event commands.

The `failure` hook is fired when a sending a log event command fails. The `data` parameter is the log event data used to create the failed command and the `error` parameter is the JavaScript `Error` object that was thrown with the failure.

The `success` hook is fired when a sending a log event command has succeeded. The `data` parameter is the log event data used to create the successful command and the `response` parameter is the response from AWS CloudWatch Logs ([PutLogEventsCommandOutput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cloudwatch-logs/interfaces/putlogeventscommandoutput.html)).

### Stream Hooks Example

```javascript
// Let's create our stream configuration.
const streamConfig = {
  failure: (data, error) => {
    // Handle our errors...
  },
  success: (data, response) => {
    // Handle successful commands...
  },
};

// Add our stream configuration when creating our stream.
shed.addListener([0], client.stream('my-group', 'errors', streamConfig));
```

## Stream Group Tags

When an instance of the transport has been configured to automatically create new log groups if they do not already exist, you can apply tags to these new log groups through the stream configuration object.

```javascript
// Let's create our stream configuration.
const streamConfig = {
  groupTags: {
    foo: 'bar',
  },
};

// Add our stream configuration when creating our stream.
shed.addListener([0], client.stream('my-group', 'errors', streamConfig));
```
