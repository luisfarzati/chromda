const AWSXRay = require("aws-xray-sdk-core");
const S3 = require("aws-sdk/clients/s3");
const uuid4 = require("uuid/v4");

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ACL = process.env.S3_ACL || "public-read";

const s3 = AWSXRay.captureAWSClient(new S3({ region: S3_REGION }));

/**
 * Uploads the `buffer` content to S3. If no `key` is specified, the object
 * will be named with a UUID and the extension inferred from the given
 * image format.
 *
 * @param {Buffer} buffer
 * @param {"jpeg"|"png"} format Image format, can be "jpeg" or "png".
 * @param {string} [bucketKey] Optional key, if not specified a UUID will be used.
 */
exports.upload = async (buffer, format, bucketKey) => {
  const uuid = uuid4();
  const key = bucketKey || `${uuid}.${format}`;

  const { Location } = await s3
    .upload({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${format}`,
      ACL: S3_ACL
    })
    .promise();

  return { uuid: uuid, url: Location };
};
