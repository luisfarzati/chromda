/**
 * @typedef {import('aws-lambda').APIGatewayEvent} APIGatewayEvent
 * @typedef {import('aws-lambda').ScheduledEvent} ScheduledEvent
 * @typedef {import('aws-lambda').SNSEvent} SNSEvent
 * @typedef {import('aws-lambda').SQSEvent} SQSEvent
 */

/**
 * @param {APIGatewayEvent|ScheduledEvent|SNSEvent|SQSEvent} event
 * @param response
 */

const normalizedResponse = (event, response) => {
  if ("httpMethod" in event) {
    return {
      "statusCode": 200,
      "body": JSON.stringify(response),
      "isBase64Encoded": false
    };
  }
  else {
    return response;
  }
};

module.exports = normalizedResponse;
