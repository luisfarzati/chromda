<img src="/chromda.png" height="220" />

# Chromda – Serverless screenshots

Chromda is an AWS Lambda function for serverless capturing screenshots of websites.

### Multiple sources

- SNS topics
- SQS queues
- CloudWatch scheduled events
- API Gateway proxy

### Configurable

- Capture full page, viewport or specific DOM element
- Exclude DOM elements (useful for ads or other unwanted content)
- Override styles

## Quick start

Provided you already have AWS credentials for Serverless, do:

```bash
git clone https://github.com/luisfarzati/chromda
cd chromda
git submodule update --init
npm install
```

Edit the `serverless.yml` file and change the example bucket name with one of your own:

```yaml
# serverless.yml
custom:
  s3Bucket: <your bucket name>
```

Deploy the function into your AWS account:

```bash
npm run deploy
```

Open the [AWS Lambda Console](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/chromda-dev-captureScreenshot) and create the following test event:

```jsonc
{
  "source": "aws.events",
  "time": "1970-01-01T00:00:00Z",
  "detail": {
    "url": "https://www.nytimes.com"
  }
}
```

Click **Test**, wait a few seconds (it might take around 8-10 secs), then you should see a response like:

```json
{
  "url": "https://<your bucket name>.s3.amazonaws.com/<uuid>.png"
}
```

## Usage

### Invocation

The function accepts different kind of events, extracting the data from the proper body attribute as follows:

| Event                                                                                                      | Body is extracted from    |
| ---------------------------------------------------------------------------------------------------------- | ------------------------- |
| [SNS Message Event](https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html)                            | `.Records[0].Sns.Message` |
| [SQS Message Event](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)                            | `.Records[0].body`        |
| [API Gateway Message Event](https://docs.aws.amazon.com/lambda/latest/dg/with-on-demand-https.html)        | `.body`                   |
| [CloudWatch Events Message Event](https://docs.aws.amazon.com/lambda/latest/dg/with-scheduled-events.html) | `.detail`                 |

### Options

```jsonc
{
  // required
  "url": "https://google.com",

  // optional - valid options: page, viewport, element
  // default: viewport
  "capture": "page",

  // selector of element to capture
  // required if capture: element
  "selector": ".container",

  // optional - S3 key for the image file
  // default: uuid()
  "s3key": "test.png",

  // optional - selectors of elements to exclude
  "exclude": [".ad", "video"],

  // optional - styles to override
  // see Puppeteer.addStyleTag
  "styles": [
    {
      "content": "body { color: #f00; }"
    }
  ],

  // optional - puppeteer options
  "puppeteer": {
    // see Puppeteer.goto options
    "navigation": {
      "timeout": 30000,
      "waitUntil": ["domcontentloaded", "networkidle2"]
    },
    // see Puppeteer.screenshot options
    "screenshot": {
      "type": "jpeg",
      "quality": 50,
      "omitBackground": false
    },
    // viewport size, overrides env defaults
    "viewport": {
      "width": 1200,
      "height": 2000
    }
  }
}
```

### Environment Variables

| Name                | Default         |
| ------------------- | --------------- |
| S3_BUCKET\*         |                 |
| S3_REGION\*         |                 |
| S3_ACL              | `"public-read"` |
| CHROMIUM_ARGS       | `"[]"`          |
| TIMEOUT             | `"30000"`       |
| IGNORE_HTTPS_ERRORS | `"false"`       |
| VIEWPORT_WIDTH      | `"1920"`        |
| VIEWPORT_HEIGHT     | `"1200"`        |
| DEVICE_SCALE_FACTOR | `"1"`           |
| IS_MOBILE           | `"false"`       |
| IS_LANDSCAPE        | `"false"`       |

## Deploy

```yaml
# serverless.yml

# ...
custom:
  s3Bucket: <your bucket name>

provider:
  # ...
  layers:
    # Replace <version> with the latest version of chrome-aws-lambda-layer
    # It depends on the region you are deploying.
    # https://github.com/shelfio/chrome-aws-lambda-layer#available-regions
    - arn:aws:lambda:${self:provider.region}:764866452798:layer:chrome-aws-lambda:<version>

functions:
  captureScreenshot:
    # ...
    environment:
      # configure the environment variables
      VIEWPORT_WIDTH: "1920"
      VIEWPORT_HEIGHT: "1200"
      # ...
    events:
      # add any of the supported event source(s) you want to use
      # the provided example uses SNS
      - sns:
          arn: !Ref chromdaTopic
          topicName: ${self:custom.snsTopic}

resources:
  # following the example, we provision an SNS topic
  chromdaTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: ${self:custom.snsTopic}
```

## X-Ray

AWS X-Ray support is provided and there are segments for Puppeteer navigation and screenshot:

![AWS X-Ray screenshot](https://i.imgur.com/uYw5PhL.png)
