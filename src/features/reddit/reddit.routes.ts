import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  extractRedditVideoSchema,
  getVideoStatusSchema,
} from './reddit.schema.js';
import {
  extractRedditVideo,
  getUserVideos,
  getVideoById,
} from './reddit.controller.js';

const router = Router();

// Protect all Reddit extraction endpoints with JWT auth
router.use(authMiddleware as any);

router.post('/extract', validate(extractRedditVideoSchema), extractRedditVideo);
router.get('/videos', getUserVideos);
router.get('/videos/:id', validate(getVideoStatusSchema), getVideoById);

export default router;
