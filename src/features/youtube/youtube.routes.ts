import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { uploadVideoSchema } from './youtube.schema.js';
import {
  getChannels,
  getChannelStats,
  getChannelById,
  getChannelVideos,
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
 * /api/v1/youtube/channels/{channelId}:
 *   get:
 *     summary: Get a single YouTube channel by ID
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel details
 * /api/v1/youtube/channels/{channelId}/videos:
 *   get:
 *     summary: Get videos for a specific YouTube channel
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of channel videos with statistics
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
router.get('/channels/:channelId', getChannelById);
router.get('/channels/:channelId/videos', getChannelVideos);
router.get('/stats', getChannelStats);
router.post('/upload', validate(uploadVideoSchema), uploadVideo);

export default router;
