import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import { googleCallbackSchema } from './auth.schema.js';
import { redirectToGoogle, handleGoogleCallback, getMe } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Redirect to Google OAuth
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get('/google', redirectToGoogle);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully authenticated
 */
router.get('/google/callback', validate(googleCallbackSchema), handleGoogleCallback);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 */
router.get('/me', authMiddleware as any, getMe);

export default router;
