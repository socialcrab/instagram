const sharp = require("sharp");
const AWS = require('aws-sdk');
const config = require("../config/config.js");
const axios = require("axios");
const moment = require("moment");

const bucketName = process.env.OSS_BUCKET_NAME;
const basePath = "instagram";

const s3 = new AWS.S3({
  endpoint: process.env.OSS_ENDPOINT,
  accessKeyId: process.env.OSS_ACCESS_KEY,
  secretAccessKey: process.env.OSS_SECRET_KEY,
  s3ForcePathStyle: true, // needed with minio?
  signatureVersion: 'v4',
  sslEnabled: process.env.OSS_SSL,
});

// Example function to upload a file
async function upload (path, buffer){
  const params = {
    Bucket: bucketName,
    Key: path,
    Body: buffer,
  };

  try {
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully. ${data.Location}`);
    return path;
  } catch (err) {
    console.error('Error uploading file:', err);
  }
};

// async function upload (buffer, path){
//   await oss.putObject(config.oss.OSS_BUCKET_NAME, path, buffer);
//   return path;
// };

function generatePath (folderName, fileName){
  return `${basePath}/${folderName}/${fileName}.webp`;
}

async function resizeImage(image, size){
  return await sharp(image).resize(size).webp().toBuffer();
}

async function copyImageToOSS (imageUrl, destinationPath, name, resizeTo){
  const response = await axios
      .get(imageUrl, { responseType: "arraybuffer" })
      .catch(() => undefined);

  if (!response) return '';

  const buffer = Buffer.from(response.data, "binary");
  const path = generatePath(destinationPath, name || moment().valueOf().toString());
  const image = await resizeImage(buffer, resizeTo || 480);

  return await upload(path, image);
}

module.exports = {
  upload,
  copyImageToOSS
}