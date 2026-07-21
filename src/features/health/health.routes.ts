import { Router } from 'express';
import { getHealth } from './health.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Check system health
 *     description: Check if the server and database are healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: System is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   example: connected
 */
router.get('/', getHealth);

export default router;
