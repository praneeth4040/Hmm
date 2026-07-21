import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, BadRequestError } from '../../utils/custom-errors.js';
import { logger } from '../../utils/logger.js';

export class RedditService {
  /**
   * Fetch Reddit post metadata using yt-dlp --dump-json.
   */
  private async fetchRedditPostMeta(redditUrl: string): Promise<{ postId: string; title: string; author: string; subreddit: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', ['--dump-json', '--no-playlist', redditUrl]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const meta = JSON.parse(stdout);
            resolve({
              postId: meta.id || 'unknown',
              title: meta.title || meta.fulltitle || 'Untitled Reddit Video',
              author: meta.uploader || meta.channel || 'unknown',
              subreddit: meta.categories?.[0] || 'unknown',
            });
          } catch (parseError) {
            reject(new BadRequestError(`Failed to parse video metadata: ${(parseError as Error).message}`));
          }
        } else {
          logger.error(`yt-dlp metadata dump failed (code ${code}): ${stderr}`);
          reject(new BadRequestError(`Invalid Reddit URL or video not found: ${stderr || 'yt-dlp exited with error'}`));
        }
      });

      child.on('error', (err) => {
        reject(new BadRequestError(`yt-dlp child process error: ${err.message}`));
      });
    });
  }

  /**
   * Downloads Reddit video + audio streams using `yt-dlp` and merges them into an MP4 file.
   */
  private async downloadVideo(redditUrl: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Starting yt-dlp download for ${redditUrl}`);

      const args = [
        '-f',
        'bv*+ba/b', // Best video + best audio, fallback to best single stream
        '--merge-output-format',
        'mp4',
        '-o',
        outputPath,
        '--no-playlist',
        redditUrl,
      ];

      const child = spawn('yt-dlp', args);

      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          logger.info(`Successfully downloaded and merged video to ${outputPath}`);
          resolve();
        } else {
          logger.error(`yt-dlp failed with exit code ${code}: ${stderr}`);
          reject(new BadRequestError(`Video download/merge failed: ${stderr || 'yt-dlp exited with error'}`));
        }
      });

      child.on('error', (err) => {
        logger.error(`Failed to start yt-dlp child process: ${err.message}`);
        reject(
          new BadRequestError(
            `yt-dlp is not installed or not accessible in PATH. Please install yt-dlp and ffmpeg on your system.`
          )
        );
      });
    });
  }

  /**
   * Uploads local MP4 file to Hugging Face Storage Bucket using S3-compatible API.
   * Gateway Endpoint: https://s3.hf.co/<namespace>
   */
  private async uploadToHFBucket(localFilePath: string, remoteFileName: string): Promise<string> {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { Upload } = await import('@aws-sdk/lib-storage');

    logger.info(`Uploading ${localFilePath} to HF Storage Bucket (${env.HF_BUCKET_NAME}/${remoteFileName})`);

    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.HF_S3_ACCESS_KEY_ID,
        secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    const fileStream = fs.createReadStream(localFilePath);

    const uploader = new Upload({
      client: s3Client,
      params: {
        Bucket: env.HF_BUCKET_NAME,
        Key: remoteFileName,
        Body: fileStream,
        ContentType: 'video/mp4',
      },
    });

    try {
      await uploader.done();
      const hfUri = `hf://buckets/${env.HF_NAMESPACE}/${env.HF_BUCKET_NAME}/${remoteFileName}`;
      logger.info(`Successfully uploaded video to HF Bucket: ${hfUri}`);
      return hfUri;
    } catch (error) {
      logger.error('Hugging Face S3 bucket upload error details:', error);
      throw new BadRequestError(`Hugging Face bucket upload failed: ${(error as Error).message || error}`);
    }
  }

  /**
   * Initiate background process for Reddit video extraction and storage.
   */
  async extractAndStoreVideo(userId: string, redditUrl: string) {
    // 1. Fetch metadata
    const meta = await this.fetchRedditPostMeta(redditUrl);

    // 2. Create PENDING video record in database
    const video = await prisma.video.create({
      data: {
        userId,
        redditUrl,
        redditPostId: meta.postId,
        redditTitle: meta.title,
        redditAuthor: meta.author,
        subreddit: meta.subreddit,
        status: 'PENDING',
      },
    });

    // 3. Process video asynchronously in background
    this.processVideoPipeline(video.id, redditUrl, meta.postId).catch((err) => {
      logger.error(`Background video processing failed for Video ID ${video.id}: ${err.message}`);
    });

    return video;
  }

  /**
   * Async pipeline worker: Download -> Upload to HF Bucket -> Clean local temp -> Update DB
   */
  private async processVideoPipeline(videoId: string, redditUrl: string, postId: string) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reddit-video-'));
    const tempFilePath = path.join(tempDir, `${videoId}.mp4`);

    try {
      // Update status to PROCESSING
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'PROCESSING' },
      });

      // Step A: Download & merge with yt-dlp to temp location
      await this.downloadVideo(redditUrl, tempFilePath);

      // Get file size
      const stats = fs.statSync(tempFilePath);
      const fileSizeBytes = BigInt(stats.size);

      // Step B: Upload to Hugging Face Storage Bucket via S3 Gateway
      const remoteFileName = `reddit_${postId}_${videoId}.mp4`;
      const hfBucketUri = await this.uploadToHFBucket(tempFilePath, remoteFileName);

      // Step C: Mark status as READY with HF Bucket URI
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'READY',
          hfBucketUri,
          fileSizeBytes,
        },
      });

      logger.info(`Video pipeline completed successfully for Video ID: ${videoId}`);
    } catch (error) {
      // Mark status as FAILED
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
        },
      });
    } finally {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Get all video records for a specific user.
   */
  async getUserVideos(userId: string) {
    return prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single video record by ID (enforce ownership).
   */
  async getVideoById(videoId: string, userId: string) {
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) {
      throw new NotFoundError('Video record not found');
    }

    return video;
  }
  /**
   * Get a presigned download URL for a video from the Hugging Face Bucket.
   */
  async getDownloadUrl(videoId: string, userId: string) {
    const video = await this.getVideoById(videoId, userId);

    if (video.status !== 'READY' || !video.hfBucketUri) {
      throw new BadRequestError('Video is not ready for download or missing URI');
    }

    logger.info(`getDownloadUrl: video.hfBucketUri = ${video.hfBucketUri}`);
    logger.info(`getDownloadUrl: env.HF_NAMESPACE = ${env.HF_NAMESPACE}`);
    logger.info(`getDownloadUrl: env.HF_BUCKET_NAME = ${env.HF_BUCKET_NAME}`);

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.HF_S3_ACCESS_KEY_ID,
        secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY,
      },
    });

    // Parse hfBucketUri: hf://buckets/<namespace>/<bucket>/<key>
    const urlParts = video.hfBucketUri.replace('hf://buckets/', '').split('/');
    const key = urlParts.slice(2).join('/'); // Extract the remoteFileName
    logger.info(`getDownloadUrl: parsed urlParts = ${JSON.stringify(urlParts)}`);
    logger.info(`getDownloadUrl: parsed key = ${key}`);

    const command = new GetObjectCommand({
      Bucket: env.HF_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${key}"`
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      logger.info(`getDownloadUrl: generated presigned URL = ${url}`);
      return url;
    } catch (error) {
      logger.error('Error generating presigned URL from HF bucket:', error);
      throw new BadRequestError(`Failed to generate download URL from Hugging Face: ${(error as Error).message}`);
    }
  }
}

export const redditService = new RedditService();
export default redditService;
