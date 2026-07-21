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
  downloadVideo,
} from './reddit.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reddit
 *   description: Reddit video extraction and management
 *
 * /api/v1/reddit/extract:
 *   post:
 *     summary: Extract and store a Reddit video
 *     tags: [Reddit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               redditUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       202:
 *         description: Video extraction started
 * /api/v1/reddit/videos:
 *   get:
 *     summary: Get user's videos
 *     tags: [Reddit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's videos
 * /api/v1/reddit/videos/{id}:
 *   get:
 *     summary: Get a specific video by ID
 *     tags: [Reddit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Video found
 * /api/v1/reddit/videos/{id}/download:
 *   get:
 *     summary: Download a video
 *     tags: [Reddit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       302:
 *         description: Redirect to video download URL
 */
// Protect all Reddit extraction endpoints with JWT auth
router.use(authMiddleware as any);

router.post('/extract', validate(extractRedditVideoSchema), extractRedditVideo);
router.get('/videos', getUserVideos);
router.get('/videos/:id', validate(getVideoStatusSchema), getVideoById);
router.get('/videos/:id/download', validate(getVideoStatusSchema), downloadVideo);

export default router;
