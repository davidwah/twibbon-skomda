import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../authMiddleware.js';
import * as s3Service from '../services/s3Service.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/frames - List all frames
 * Public endpoint
 */
router.get('/', async (req, res) => {
  try {
    const metadata = await s3Service.getMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Failed to fetch frames' });
  }
});

/**
 * GET /api/frames/:id - Get specific frame
 * Public endpoint
 */
router.get('/:id', async (req, res) => {
  try {
    const metadata = await s3Service.getMetadata();
    const frame = metadata.frames.find(f => f.id === req.params.id);
    
    if (!frame) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    
    res.json(frame);
  } catch (error) {
    console.error('Error fetching frame:', error);
    res.status(500).json({ error: 'Failed to fetch frame' });
  }
});

/**
 * POST /api/frames - Upload new frame
 * Admin only endpoint
 */
router.post('/', authMiddleware, upload.single('frame'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Frame name is required' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const fileName = `${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '-')}${extension}`;

    // Upload to S3
    const uploadResult = await s3Service.uploadFrame(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    // Get current metadata
    const metadata = await s3Service.getMetadata();
    
    // Create new frame entry
    const newFrame = {
      id: `frame-${timestamp}`,
      name,
      description: description || '',
      url: uploadResult.url,
      key: uploadResult.key,
      isDefault: isDefault === 'true' || isDefault === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If this is set as default, unset other defaults
    if (newFrame.isDefault) {
      metadata.frames.forEach(f => f.isDefault = false);
    }

    // Add new frame to metadata
    metadata.frames.push(newFrame);

    // Save updated metadata
    await s3Service.saveMetadata(metadata);

    res.status(201).json(newFrame);
  } catch (error) {
    console.error('Error uploading frame:', error);
    res.status(500).json({ error: 'Failed to upload frame', message: error.message });
  }
});

/**
 * PUT /api/frames/:id - Update frame metadata
 * Admin only endpoint
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, isDefault } = req.body;
    
    // Get current metadata
    const metadata = await s3Service.getMetadata();
    const frameIndex = metadata.frames.findIndex(f => f.id === req.params.id);
    
    if (frameIndex === -1) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    // Update frame
    const frame = metadata.frames[frameIndex];
    if (name !== undefined) frame.name = name;
    if (description !== undefined) frame.description = description;
    if (isDefault !== undefined) {
      const shouldBeDefault = isDefault === 'true' || isDefault === true;
      frame.isDefault = shouldBeDefault;
      
      // If this is set as default, unset other defaults
      if (shouldBeDefault) {
        metadata.frames.forEach((f, idx) => {
          if (idx !== frameIndex) f.isDefault = false;
        });
      }
    }
    frame.updatedAt = new Date().toISOString();

    // Save updated metadata
    await s3Service.saveMetadata(metadata);

    res.json(frame);
  } catch (error) {
    console.error('Error updating frame:', error);
    res.status(500).json({ error: 'Failed to update frame' });
  }
});

/**
 * DELETE /api/frames/:id - Delete frame
 * Admin only endpoint
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get current metadata
    const metadata = await s3Service.getMetadata();
    const frameIndex = metadata.frames.findIndex(f => f.id === req.params.id);
    
    if (frameIndex === -1) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    const frame = metadata.frames[frameIndex];

    // Delete from S3
    await s3Service.deleteFrame(frame.key);

    // Remove from metadata
    metadata.frames.splice(frameIndex, 1);

    // Save updated metadata
    await s3Service.saveMetadata(metadata);

    res.json({ message: 'Frame deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting frame:', error);
    res.status(500).json({ error: 'Failed to delete frame' });
  }
});

export default router;
