import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { generateNarrationSchema } from './narration.schema.js';
import { generateNarration, listCategories } from './narration.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Narration
 *   description: AI-powered narration generation
 *
 * /api/v1/narration/categories:
 *   get:
 *     summary: List all available narration categories
 *     tags: [Narration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 * /api/v1/narration/generate:
 *   post:
 *     summary: Generate a narration
 *     tags: [Narration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: string
 *               storyDetails:
 *                 type: string
 *               model:
 *                 type: string
 *                 description: Optional model override
 *               targetWords:
 *                 type: integer
 *                 description: Optional target word count
 *     responses:
 *       200:
 *         description: Narration generated
 */
// All narration endpoints require authentication
router.use(authMiddleware as any);

// GET  /api/v1/narration/categories — List all available story categories
router.get('/categories', listCategories);

// POST /api/v1/narration/generate   — Generate narration for a category + story details
router.post('/generate', validate(generateNarrationSchema), generateNarration);

export default router;
