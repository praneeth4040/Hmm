import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import { googleCallbackSchema } from './auth.schema.js';
import { redirectToGoogle, handleGoogleCallback } from './auth.controller.js';

const router = Router();

router.get('/google', redirectToGoogle);
router.get('/google/callback', validate(googleCallbackSchema), handleGoogleCallback);

export default router;
