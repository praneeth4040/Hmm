import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import { googleCallbackSchema } from './auth.schema.js';
import { redirectToGoogle, handleGoogleCallback } from './auth.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Redirect to Google OAuth
 *     description: Redirects the user to Google OAuth for authentication
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional JWT token for linking Google account to existing user
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
 *     description: Handles the callback from Google after user authentication
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Google authorization code
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Optional state (user ID if linking to existing account)
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: JWT token
 */
router.get('/google/callback', validate(googleCallbackSchema), handleGoogleCallback);

export default router;
