import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { generateNarrationSchema } from './narration.schema.js';
import { generateNarration, listCategories } from './narration.controller.js';

const router = Router();

// All narration endpoints require authentication
router.use(authMiddleware as any);

// GET  /api/v1/narration/categories — List all available story categories
router.get('/categories', listCategories);

// POST /api/v1/narration/generate   — Generate narration for a category + story details
router.post('/generate', validate(generateNarrationSchema), generateNarration);

export default router;
