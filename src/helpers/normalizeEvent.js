/**
 * @typedef {import('aws-lambda').APIGatewayEvent} APIGatewayEvent
 * @typedef {import('aws-lambda').ScheduledEvent} ScheduledEvent
 * @typedef {import('aws-lambda').SNSEvent} SNSEvent
 * @typedef {import('aws-lambda').SQSEvent} SQSEvent
 */

/**
 * @param {APIGatewayEvent|ScheduledEvent|SNSEvent|SQSEvent} event
 */
const normalizedEvent = event => {
  if ("Records" in event && "Sns" in event.Records[0]) {
    return JSON.parse(event.Records[0].Sns.Message);
  } else if ("Records" in event && "messageId" in event.Records[0]) {
    if (event.Records.length > 1) {
      console.warn(
        `${event.Records.length} has been received, but only one will be processed. Make sure the configured batch size is 1.`
      );
    }
    return JSON.parse(event.Records[0].body);
  } else if ("httpMethod" in event) {
    return JSON.parse(event.queryStringParameters.json);
  } else if ("time" in event) {
    return event.detail;
  } else {
    throw new Error("Event type not supported");
  }
};

module.exports = normalizedEvent;
