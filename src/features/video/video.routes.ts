import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  extractVideo,
  getUserVideos,
  getVideoById,
  getDownloadUrl,
} from './video.controller.js';
import { extractVideoSchema } from './video.schema.js';

const router = Router();

// All video routes are protected
router.use(authMiddleware as any);

// Extract video (Reddit or YouTube)
router.post('/extract', validate(extractVideoSchema), extractVideo);

// Get user's videos
router.get('/', getUserVideos);

// Get video by id
router.get('/:videoId', getVideoById);

// Get download URL
router.get('/:videoId/download', getDownloadUrl);

export default router;
