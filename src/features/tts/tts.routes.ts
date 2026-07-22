import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware.js';
import { generateTTSSchema } from './tts.schema.js';
import { generateTTS, listVoices } from './tts.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: TTS
 *   description: Text-to-speech using free Edge-TTS
 * 
 * /api/v1/tts/voices:
 *   get:
 *     summary: List available TTS voices
 *     tags: [TTS]
 *     responses:
 *       200:
 *         description: List of TTS voices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 voices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Voice ID
 *                       shortName:
 *                         type: string
 *                         description: Edge-TTS short name
 *                       description:
 *                         type: string
 *                         description: Voice description
 * 
 * /api/v1/tts/generate:
 *   post:
 *     summary: Generate TTS audio
 *     tags: [TTS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to convert to speech
 *                 example: "Hello, how are you?"
 *               voiceId:
 *                 type: string
 *                 enum: [MOTHER, SISTER, FATHER, BROTHER]
 *                 description: Voice to use
 *               rate:
 *                 type: number
 *                 description: Speech rate (-0.5 to 0.5)
 *                 example: 0
 *     responses:
 *       200:
 *         description: TTS audio file (MP3)
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/voices', listVoices);
router.post('/generate', validate(generateTTSSchema), generateTTS);

export default router;
