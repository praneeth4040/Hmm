import fs from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { NotFoundError, BadRequestError } from "../../utils/custom-errors.js";
import { logger } from "../../utils/logger.js";
import type { CaptionSegment, CaptionStyle } from "./captions.schema.js";

export class CaptionsService {
  private readonly alignmentMap: Record<string, number> = {
    "bottom-left": 1,
    "bottom-center": 2,
    "bottom-right": 3,
    "middle-left": 4,
    "middle-center": 5,
    "middle-right": 6,
    "top-left": 7,
    "top-center": 8,
    "top-right": 9,
  };

  /**
   * Convert color name or hex to ASS color format (&HBBGGRR)
   */
  private colorToAssColor(color: string): string {
    const namedColors: Record<string, string> = {
      white: "ffffff",
      black: "000000",
      red: "0000ff",
      green: "00ff00",
      blue: "ff0000",
      yellow: "00ffff",
      cyan: "ffff00",
      magenta: "ff00ff",
      gray: "808080",
      grey: "808080",
    };

    let hex = color.toLowerCase();
    if (namedColors[hex]) {
      hex = namedColors[hex];
    }

    if (hex.startsWith("#")) {
      hex = hex.slice(1);
    }

    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    if (hex.length !== 6) {
      return "00ffffff";
    }

    const rr = hex.slice(0, 2);
    const gg = hex.slice(2, 4);
    const bb = hex.slice(4, 6);
    return `&H00${bb}${gg}${rr}`;
  }

  /**
   * Helper method to get presigned URL from Hugging Face
   */
  private async getPresignedDownloadUrl(videoId: string, userId: string): Promise<string> {
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) {
      throw new NotFoundError("Video record not found");
    }

    if (video.status !== "READY" || !video.hfBucketUri) {
      throw new BadRequestError("Video is not ready for download or missing URI");
    }

    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const s3Client = new S3Client({
      region: "us-east-1",
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.HF_S3_ACCESS_KEY_ID,
        secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY,
      },
    });

    const urlParts = video.hfBucketUri.replace("hf://buckets/", "").split("/");
    const key = urlParts.slice(2).join("/");

    const command = new GetObjectCommand({
      Bucket: env.HF_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${key}"`,
    });

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (error) {
      logger.error("Error generating presigned URL from HF bucket:", error);
      throw new BadRequestError(`Failed to generate download URL from Hugging Face: ${(error as Error).message}`);
    }
  }

  /**
   * Convert seconds to SRT time format (HH:MM:SS,mmm)
   */
  private secondsToSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  }

  /**
   * Create SRT subtitle file from caption segments
   */
  private createSrtFile(captions: CaptionSegment[], srtPath: string): void {
    let srtContent = "";
    captions.forEach((segment, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${this.secondsToSrtTime(segment.startTime)} --> ${this.secondsToSrtTime(segment.endTime)}\n`;
      srtContent += `${segment.text}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent, "utf8");
  }

  /**
   * Build ffmpeg force style string from CaptionStyle
   */
  private buildForceStyleString(style: CaptionStyle): string {
    const styles: string[] = [];

    styles.push(`Alignment=${this.alignmentMap[style.alignment!]}`);
    styles.push(`FontSize=${style.fontSize}`);
    styles.push(`FontName=${style.fontName}`);
    styles.push(`PrimaryColour=${this.colorToAssColor(style.primaryColor!)}`);

    if (style.secondaryColor) {
      styles.push(`SecondaryColour=${this.colorToAssColor(style.secondaryColor)}`);
    }

    if (style.outlineColor) {
      styles.push(`OutlineColour=${this.colorToAssColor(style.outlineColor)}`);
    }

    if (typeof style.outlineWidth === "number") {
      styles.push(`Outline=${style.outlineWidth}`);
    }

    if (style.backColor) {
      styles.push(`BackColour=${this.colorToAssColor(style.backColor)}`);
    }

    styles.push(`Bold=${style.bold ? 1 : 0}`);
    styles.push(`Italic=${style.italic ? 1 : 0}`);
    styles.push(`Underline=${style.underline ? 1 : 0}`);

    return styles.join(",");
  }

  /**
   * Helper method to add dynamic captions using ffmpeg subtitles filter
   */
  private async addCaptionsToVideo(inputPath: string, outputPath: string, srtPath: string, style: CaptionStyle): Promise<void> {
    const forceStyle = this.buildForceStyleString(style);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec("libx264")
        .audioCodec("copy")
        .outputOptions([
          "-vf",
          `subtitles='${srtPath.replace(/'/g, "'\\''")}':force_style='${forceStyle}'`,
        ])
        .on("end", () => {
          logger.info("ffmpeg caption processing completed");
          resolve();
        })
        .on("error", (err) => {
          logger.error("ffmpeg caption processing failed:", err);
          reject(new BadRequestError(`Failed to add captions: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Download video and add captions
   */
  async downloadVideoWithCaptions(videoId: string, userId: string, captions: CaptionSegment[], style?: CaptionStyle): Promise<string> {
    const presignedUrl = await this.getPresignedDownloadUrl(videoId, userId);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "reddit-video-captions-"));
    const originalVideoPath = path.join(tempDir, `${videoId}_original.mp4`);
    const srtPath = path.join(tempDir, `${videoId}_captions.srt`);
    const captionedVideoPath = path.join(tempDir, `${videoId}_captioned.mp4`);

    const mergedStyle: CaptionStyle = {
      fontName: "Arial",
      fontSize: 48,
      primaryColor: "white",
      outlineColor: "black",
      outlineWidth: 2,
      alignment: "bottom-center",
      bold: false,
      italic: false,
      underline: false,
      ...style,
    };

    try {
      logger.info(`Downloading original video to ${originalVideoPath}`);
      const downloadResponse = await fetch(presignedUrl);
      if (!downloadResponse.ok) {
        throw new BadRequestError("Failed to download original video from Hugging Face");
      }
      const videoBuffer = Buffer.from(await downloadResponse.arrayBuffer());
      fs.writeFileSync(originalVideoPath, videoBuffer);
      logger.info("Original video downloaded successfully");

      logger.info("Creating SRT subtitle file");
      this.createSrtFile(captions, srtPath);

      logger.info("Adding captions to video with ffmpeg");
      await this.addCaptionsToVideo(originalVideoPath, captionedVideoPath, srtPath, mergedStyle);
      logger.info("Captions added successfully");

      return captionedVideoPath;
    } catch (error) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }
}

export const captionsService = new CaptionsService();
export default captionsService;
