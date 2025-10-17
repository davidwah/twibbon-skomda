# Express Backend Server

This Express backend provides admin-only API endpoints for managing twibbon frames stored in AWS S3.

## Features

- **Admin Authentication**: Bearer token authentication for protected endpoints
- **Frame Management**: Upload, list, update, and delete twibbon frames
- **S3 Integration**: Stores frames and metadata in AWS S3
- **Static File Serving**: Serves the existing public/ directory
- **Health Check**: `/healthz` endpoint for monitoring

## Setup

1. Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

2. Configure the following environment variables:

```
PORT=3000
ADMIN_TOKEN=your-secure-admin-token-here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm run server
```

## API Endpoints

### Public Endpoints

- `GET /healthz` - Health check endpoint
- `GET /api/frames` - List all frames
- `GET /api/frames/:id` - Get specific frame details

### Admin Endpoints (require `Authorization: Bearer <token>`)

- `POST /api/frames` - Upload a new frame
  - Body: multipart/form-data
  - Fields: `frame` (file), `name` (string), `description` (string, optional), `isDefault` (boolean, optional)
  
- `PUT /api/frames/:id` - Update frame metadata
  - Body: JSON
  - Fields: `name` (string, optional), `description` (string, optional), `isDefault` (boolean, optional)
  
- `DELETE /api/frames/:id` - Delete a frame

## Example Usage

### List all frames

```bash
curl http://localhost:3000/api/frames
```

### Upload a new frame (admin only)

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  -F "frame=@/path/to/frame.png" \
  -F "name=My Frame" \
  -F "description=A cool frame" \
  -F "isDefault=true" \
  http://localhost:3000/api/frames
```

### Update frame metadata (admin only)

```bash
curl -X PUT \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Frame Name","isDefault":true}' \
  http://localhost:3000/api/frames/frame-123456789
```

### Delete a frame (admin only)

```bash
curl -X DELETE \
  -H "Authorization: Bearer your-admin-token" \
  http://localhost:3000/api/frames/frame-123456789
```

## Architecture

- **src/server/index.js** - Main Express server setup
- **src/server/authMiddleware.js** - Authentication middleware
- **src/server/routes/frames.js** - Frame management API routes
- **src/server/services/s3Service.js** - AWS S3 integration service

## Static Files

The server serves all files from the `public/` directory, allowing the frontend to work seamlessly with the backend as a single process.

## Development

For development with auto-restart on changes, you can use nodemon:

```bash
npm install -g nodemon
npm run server:dev
```
