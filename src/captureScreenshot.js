const AWSXRay = require("aws-xray-sdk-core");
AWSXRay.captureHTTPsGlobal(require("https"), true);
const { URL } = require("url");
const chromeLambda = require("chrome-aws-lambda");
const MrPuppetshot = require("mrpuppetshot");
const normalizeEvent = require("./helpers/normalizeEvent");
const normalizeResponse = require("./helpers/normalizeResponse");
const S3Bucket = require("./helpers/s3bucket");

// Defaults
const CHROMIUM_ARGS = JSON.parse(process.env.CHROMIUM_ARGS || "[]");
const TIMEOUT = Number(process.env.TIMEOUT) || 30 * 1000;
const IGNORE_HTTPS_ERRORS = process.env.IGNORE_HTTPS_ERRORS === "true";
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH) || 1920;
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT) || 1200;
const DEVICE_SCALE_FACTOR = Number(process.env.DEVICE_SCALE_FACTOR) || 1;
const IS_MOBILE = process.env.IS_MOBILE === "true";
const IS_LANDSCAPE = process.env.IS_LANDSCAPE === "true";

/**
 * @typedef {import('puppeteer-core').DirectNavigationOptions} PuppeteerDirectNavigationOptions
 * @typedef {import('puppeteer-core').BinaryScreenShotOptions} PuppeteerBinaryScreenShotOptions
 * @typedef {import('puppeteer-core').StyleTagOptions} PuppeteerStyleTagOptions
 * @typedef {import('puppeteer-core').Viewport} PuppeteerViewportOptions
 */

/**
 * @typedef {object} PuppeteerOptions
 * @property {PuppeteerDirectNavigationOptions} [navigation]
 * @property {PuppeteerBinaryScreenShotOptions} [screenshot]
 * @property {PuppeteerViewportOptions} [viewport]
 */

/**
 * @typedef {object} ChromdaOptions
 * @property {string} url
 * @property {string} [s3key]
 * @property {"page"|"viewport"|"element"} [capture]
 * @property {PuppeteerOptions} [puppeteer]
 * @property {string[]} [exclude]
 * @property {string} [selector]
 * @property {PuppeteerStyleTagOptions[]} [styles]
 */

const defaultViewport = {
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
  isMobile: IS_MOBILE,
  isLandscape: IS_LANDSCAPE
};

const puppetshot = chromeLambda.executablePath.then(
  executablePath =>
    new MrPuppetshot(
      {
        executablePath,
        args: [...chromeLambda.args, ...CHROMIUM_ARGS],
        headless: true,
        defaultViewport,
        ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS,
        timeout: TIMEOUT
      },
      chromeLambda.puppeteer
    )
);

/**
 * @type {import('aws-lambda').Handler}
 */
exports.handler = async (event, callback) => {
  callback.callbackWaitsForEmptyEventLoop = false;

  /** @type {ChromdaOptions} */
  const options = normalizeEvent(event);

  // validate URL before wasting time waiting for Chrome to start
  new URL(options?.url);

  const browser = await puppetshot;

  await AWSXRay.captureAsyncFunc("navigate", async segment => {
    segment.addAnnotation("url", options.url);
    options.puppeteer?.navigation &&
      segment.addAnnotation(
        "options",
        JSON.stringify(options.puppeteer?.navigation)
      );
    await browser.navigate(options.url, options.puppeteer?.navigation);
    segment.close();
  });

  options.puppeteer?.viewport &&
    (await browser.resizeViewport(options.puppeteer.viewport));

  options.styles &&
    (await Promise.all([
      options.styles.map(style => browser.overrideStyles(style))
    ]));

  options.exclude?.length && (await browser.excludeElements(options.exclude));

  const imageType = options.puppeteer?.screenshot?.type || "png";
  const capture = options.capture || "viewport";

  const buffer = await AWSXRay.captureAsyncFunc("screenshot", async segment => {
    segment.addAnnotation("capture", capture);

    /** @type {Buffer} */
    let buffer;

    switch (capture) {
      case "element":
        buffer = await browser.elementScreenshot(
          options.selector,
          options.puppeteer?.screenshot
        );
        break;
      case "page":
        buffer = await browser.pageScreenshot(options.puppeteer?.screenshot);
        break;
      case "viewport":
      default:
        buffer = await browser.viewportScreenshot(
          options.puppeteer?.screenshot
        );
    }

    segment.close();
    return buffer;
  });

  const response = await S3Bucket.upload(buffer, imageType, options.s3key);

  return normalizeResponse(event, response);
};
