import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  prepareEdit,
  streamSession,
  saveEdit,
  discardSession,
  getUserVideos,
  getVideoById,
  getDownloadUrl,
  deleteVideo,
} from './video.controller.js';
import {
  prepareEditSchema,
  saveEditSchema,
  sessionIdParamSchema,
  videoIdParamSchema,
} from './video.schema.js';

const router = Router();
router.use(authMiddleware as any);

/**
 * @swagger
 * tags:
 *   name: Video
 *   description: Video downloader (Reddit & YouTube) with edit-before-save flow
 *
 * /api/v1/video/prepare:
 *   post:
 *     summary: Download a Reddit or YouTube video into a server-side edit session
 *     tags: [Video]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string, format: uri }
 *     responses:
 *       200: { description: Edit session created }
 *
 * /api/v1/video/session/{sessionId}/stream:
 *   get:
 *     summary: Stream the raw temp video file (supports Range headers)
 *     tags: [Video]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Video stream }
 *
 * /api/v1/video/session/{sessionId}/save:
 *   post:
 *     summary: Save (optionally trimmed) session video to HF and create DB record
 *     tags: [Video]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trim:
 *                 type: object
 *                 properties:
 *                   startSec: { type: number, minimum: 0 }
 *                   endSec:   { type: number, minimum: 0 }
 *     responses:
 *       201: { description: Video saved }
 *
 * /api/v1/video/session/{sessionId}:
 *   delete:
 *     summary: Discard edit session without saving
 *     tags: [Video]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Session discarded }
 */

// Edit-first flow
router.post('/prepare',                                       validate(prepareEditSchema),       prepareEdit);
router.get( '/session/:sessionId/stream',                     validate(sessionIdParamSchema),     streamSession);
router.post('/session/:sessionId/save',                       validate(saveEditSchema),           saveEdit);
router.delete('/session/:sessionId',                          validate(sessionIdParamSchema),     discardSession);

// Saved video library
router.get(   '/',                                            getUserVideos);
router.get(   '/:videoId',                                    validate(videoIdParamSchema),       getVideoById);
router.get(   '/:videoId/download',                           validate(videoIdParamSchema),       getDownloadUrl);
router.delete('/:videoId',                                    validate(videoIdParamSchema),       deleteVideo);

export default router;
