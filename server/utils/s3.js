// server/s3.js
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

module.exports = s3;
