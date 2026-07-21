import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { uploadVideoSchema } from './youtube.schema.js';
import {
  getChannels,
  getChannelStats,
  uploadVideo,
} from './youtube.controller.js';

const router = Router();

// Secure all YouTube routes with JWT authentication
router.use(authMiddleware as any);

router.get('/channels', getChannels);
router.get('/stats', getChannelStats);
router.post('/upload', validate(uploadVideoSchema), uploadVideo);

export default router;
