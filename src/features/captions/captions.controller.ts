import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { captionsService } from "./captions.service.js";
import { logger } from "../../utils/logger.js";
import type { AddCaptionsInput } from "./captions.schema.js";

export const downloadVideoWithCaptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let tempDir: string | null = null;

  try {
    const userId = (req as any).user.id;
    const { videoId } = req.params;
    const { captions, style } = req.body as AddCaptionsInput["body"];

    const captionedVideoPath = await captionsService.downloadVideoWithCaptions(
      videoId,
      userId,
      captions,
      style
    );
    tempDir = path.dirname(captionedVideoPath);

    res.download(
      captionedVideoPath,
      `video_${videoId}_captioned.mp4`,
      (err) => {
        if (err) {
          logger.error("Error sending captioned video:", err);
          next(err);
        }

        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.info("Temp directory cleaned up");
        }
      }
    );
  } catch (error) {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    next(error);
  }
};
