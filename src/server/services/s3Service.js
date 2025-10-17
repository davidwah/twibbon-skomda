import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Initialize S3 client
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    const config = {
      region,
    };

    // Use credentials if provided, otherwise fall back to default credential chain
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    s3Client = new S3Client(config);
  }
  return s3Client;
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const FRAMES_PREFIX = 'frames/';
const METADATA_KEY = 'frames-metadata.json';

/**
 * Upload a frame image to S3
 */
export async function uploadFrame(fileBuffer, fileName, contentType) {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const key = `${FRAMES_PREFIX}${fileName}`;
  
  const upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    },
  });

  await upload.done();
  
  return {
    key,
    url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
  };
}

/**
 * Get metadata from S3
 */
export async function getMetadata() {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: METADATA_KEY,
    });

    const response = await getS3Client().send(command);
    const bodyString = await streamToString(response.Body);
    return JSON.parse(bodyString);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // If metadata doesn't exist, return empty array
      return { frames: [] };
    }
    throw error;
  }
}

/**
 * Save metadata to S3
 */
export async function saveMetadata(metadata) {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: METADATA_KEY,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
  });

  await getS3Client().send(command);
}

/**
 * Delete a frame from S3
 */
export async function deleteFrame(key) {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await getS3Client().send(command);
}

/**
 * List all frames in S3
 */
export async function listFrames() {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: FRAMES_PREFIX,
  });

  const response = await getS3Client().send(command);
  return response.Contents || [];
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
