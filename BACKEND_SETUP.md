# Backend Setup Guide

This guide will help you set up and run the Express backend server for the Twibbon application.

## Overview

The backend provides:
- Admin-only API for managing twibbon frames
- AWS S3 integration for storing frames and metadata
- Static file serving for the existing frontend
- Health monitoring endpoint

## Prerequisites

- Node.js 14+ installed
- AWS account with S3 bucket created
- AWS credentials with S3 read/write permissions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and set the following:

```env
# Server Configuration
PORT=3000

# Admin Authentication
ADMIN_TOKEN=your-secure-admin-token-here

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

### 3. Start the Server

```bash
npm run server
```

The server will start on the configured port (default: 3000) and display:
```
Server is running on port 3000
Health check: http://localhost:3000/healthz
API endpoint: http://localhost:3000/api/frames
Static files served from: /home/runner/work/twibbon-skomda/twibbon-skomda/public
```

## Testing the Setup

### Test Health Endpoint

```bash
curl http://localhost:3000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T04:00:00.000Z",
  "uptime": 10.5
}
```

### Test Static Files

Open your browser and navigate to:
```
http://localhost:3000/
```

You should see the Twibbon application homepage.

### Test Admin Authentication

Try accessing a protected endpoint without authentication:

```bash
curl -X POST http://localhost:3000/api/frames
```

Expected response:
```json
{
  "error": "Authorization header is required"
}
```

Try with your admin token:

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/api/frames
```

Expected response (without file):
```json
{
  "error": "No file uploaded"
}
```

## API Usage Examples

### Upload a Frame (Admin Only)

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  -F "frame=@/path/to/frame.png" \
  -F "name=My Frame" \
  -F "description=A cool frame" \
  -F "isDefault=true" \
  http://localhost:3000/api/frames
```

### List All Frames (Public)

```bash
curl http://localhost:3000/api/frames
```

### Get Specific Frame (Public)

```bash
curl http://localhost:3000/api/frames/frame-123456789
```

### Update Frame Metadata (Admin Only)

```bash
curl -X PUT \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Frame Name","isDefault":true}' \
  http://localhost:3000/api/frames/frame-123456789
```

### Delete Frame (Admin Only)

```bash
curl -X DELETE \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/api/frames/frame-123456789
```

## AWS S3 Setup

### Create S3 Bucket

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Enter a unique bucket name
4. Select your preferred region
5. Configure permissions (allow your IAM user to read/write)
6. Create the bucket

### Configure IAM User

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

### S3 Bucket Structure

The application will create the following structure in your bucket:

```
your-bucket-name/
├── frames/                    # Frame images
│   ├── 1234567890-frame1.png
│   ├── 1234567891-frame2.png
│   └── ...
└── frames-metadata.json       # Metadata for all frames
```

## Metadata Structure

The `frames-metadata.json` file stores information about all frames:

```json
{
  "frames": [
    {
      "id": "frame-1234567890",
      "name": "MPLS Frame",
      "description": "Official MPLS frame",
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/frames/1234567890-frame.png",
      "key": "frames/1234567890-frame.png",
      "isDefault": true,
      "createdAt": "2025-10-17T04:00:00.000Z",
      "updatedAt": "2025-10-17T04:00:00.000Z"
    }
  ]
}
```

## Troubleshooting

### Server won't start

- Check that all environment variables are set in `.env`
- Ensure the PORT is not already in use
- Verify Node.js version is 14+

### S3 errors

- Verify AWS credentials are correct
- Check that the IAM user has proper permissions
- Ensure the S3 bucket exists and is in the correct region
- Check AWS region is correctly set

### Authentication errors

- Verify `ADMIN_TOKEN` is set in `.env`
- Ensure the token in the request matches the one in `.env`
- Check that the `Authorization` header format is: `Bearer <token>`

### Static files not loading

- Ensure the `public/` directory exists and contains the frontend files
- Run `npm run build` to build the frontend if needed
- Check browser console for 404 errors

## Development

For development with auto-restart on file changes:

```bash
npm install -g nodemon
npm run server:dev
```

## Production Deployment

### Environment Variables

Set the following environment variables on your production server:
- `PORT` - Server port
- `ADMIN_TOKEN` - Strong, randomly generated token
- `AWS_REGION` - Your S3 bucket region
- `AWS_ACCESS_KEY_ID` - Production AWS credentials
- `AWS_SECRET_ACCESS_KEY` - Production AWS credentials
- `S3_BUCKET_NAME` - Production S3 bucket name

### Security Considerations

1. **Use strong admin token**: Generate a strong, random token for production
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS appropriately for your domain
4. **Rate limiting**: Consider adding rate limiting middleware
5. **Logging**: Implement proper logging for monitoring and debugging
6. **AWS credentials**: Use IAM roles instead of access keys when possible

## Architecture

```
src/server/
├── index.js              # Main Express server
├── authMiddleware.js     # Admin authentication
├── routes/
│   └── frames.js         # Frame management API
├── services/
│   └── s3Service.js      # AWS S3 integration
└── README.md             # API documentation
```

## Support

For more detailed API documentation, see [src/server/README.md](src/server/README.md).
