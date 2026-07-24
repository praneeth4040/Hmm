import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import { googleCallbackSchema, updateAccountPersonaSchema } from './auth.schema.js';
import {
  redirectToGoogle,
  handleGoogleCallback,
  getMe,
  getAccounts,
  updateAccountPersona,
} from './auth.controller.js';
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

/**
 * @swagger
 * /api/v1/auth/accounts:
 *   get:
 *     summary: List all connected accounts with card persona fields
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of connected accounts
 *
 * /api/v1/auth/accounts/{accountId}:
 *   patch:
 *     summary: Update card persona (username + avatar) for a connected account
 *     description: >
 *       The cardUsername and cardAvatarUrl fields are injected into Reddit
 *       and X card templates when generating PNG cards.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardUsername:
 *                 type: string
 *               cardAvatarUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated account
 */
router.get('/accounts', authMiddleware as any, getAccounts);
router.patch(
  '/accounts/:accountId',
  authMiddleware as any,
  validate(updateAccountPersonaSchema),
  updateAccountPersona
);

export default router;
