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

/**
 * @swagger
 * tags:
 *   name: YouTube
 *   description: YouTube API integration
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /api/v1/youtube/channels:
 *   get:
 *     summary: Get user's YouTube channels
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of YouTube channels
 * /api/v1/youtube/stats:
 *   get:
 *     summary: Get user's YouTube channel stats
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Channel statistics
 * /api/v1/youtube/upload:
 *   post:
 *     summary: Upload video to YouTube
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               filePath:
 *                 type: string
 *               privacyStatus:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *     responses:
 *       201:
 *         description: Video uploaded
 */
// Secure all YouTube routes with JWT authentication
router.use(authMiddleware as any);

router.get('/channels', getChannels);
router.get('/stats', getChannelStats);
router.post('/upload', validate(uploadVideoSchema), uploadVideo);

export default router;
