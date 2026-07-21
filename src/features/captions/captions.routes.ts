import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { addCaptionsSchema } from "./captions.schema.js";
import { downloadVideoWithCaptions } from "./captions.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Captions
 *   description: Add captions to Reddit videos
 *
 * /api/v1/captions/{videoId}:
 *   post:
 *     summary: Add dynamic captions to a video and download
 *     tags: [Captions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the video to add captions to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               captions:
 *                 type: array
 *                 description: Array of caption segments
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                       description: Caption text
 *                     startTime:
 *                       type: number
 *                       description: Start time in seconds
 *                     endTime:
 *                       type: number
 *                       description: End time in seconds
 *               style:
 *                 type: object
 *                 description: Style options for captions
 *                 properties:
 *                   fontName:
 *                     type: string
 *                     description: Font name (e.g., Arial, Helvetica
 *                     default: Arial
 *                   fontSize:
 *                     type: integer
 *                     description: Font size (8-200)
 *                     default: 48
 *                   primaryColor:
 *                     type: string
 *                     description: Primary text color (color name or hex, e.g., white, #ffffff)
 *                     default: white
 *                   secondaryColor:
 *                     type: string
 *                     description: Secondary text color
 *                   outlineColor:
 *                     type: string
 *                     description: Outline color
 *                     default: black
 *                   outlineWidth:
 *                     type: integer
 *                     description: Outline width (0-10)
 *                     default: 2
 *                   backColor:
 *                     type: string
 *                     description: Background color
 *                   alignment:
 *                     type: string
 *                     enum:
 *                       - bottom-left
 *                       - bottom-center
 *                       - bottom-right
 *                       - middle-left
 *                       - middle-center
 *                       - middle-right
 *                       - top-left
 *                       - top-center
 *                       - top-right
 *                     default: bottom-center
 *                   bold:
 *                     type: boolean
 *                     description: Bold text
 *                     default: false
 *                   italic:
 *                     type: boolean
 *                     description: Italic text
 *                     default: false
 *                   underline:
 *                     type: boolean
 *                     description: Underline text
 *                     default: false
 *     responses:
 *       200:
 *         description: Video with captions downloaded
 */
router.use(authMiddleware as any);

router.post("/:videoId", validate(addCaptionsSchema), downloadVideoWithCaptions);

export default router;
