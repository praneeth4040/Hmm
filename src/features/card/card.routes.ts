import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import { generateCardSchema } from "./card.schema.js";
import { generateRedditCard, generateXCard } from "./card.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Card
 *   description: Dynamic PNG card generation
 *
 * /api/v1/card/reddit-card:
 *   post:
 *     summary: Generate Reddit-style PNG card
 *     tags: [Card]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username to display
 *                 default: Redditor
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of avatar image
 *               text:
 *                 type: string
 *                 description: Main text content
 *     responses:
 *       200:
 *         description: PNG image of the card
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post("/reddit-card", validate(generateCardSchema), generateRedditCard);

/**
 * @swagger
 * /api/v1/card/x-card:
 *   post:
 *     summary: Generate X (Twitter)-style PNG card
 *     tags: [Card]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username to display
 *                 default: X User
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of avatar image
 *               text:
 *                 type: string
 *                 description: Main text content
 *     responses:
 *       200:
 *         description: PNG image of the card
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post("/x-card", validate(generateCardSchema), generateXCard);

export default router;
