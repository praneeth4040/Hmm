import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, BadRequestError } from '../../utils/custom-errors.js';
import { logger } from '../../utils/logger.js';

type VideoSource = 'REDDIT' | 'YOUTUBE';

export class VideoService {
  /**
   * Detect if a URL is Reddit or YouTube
   */
  private detectSource(url: string): VideoSource {
    if (/reddit\.com/i.test(url)) {
      return 'REDDIT';
    }
    if (/youtube\.com|youtu\.be/i.test(url)) {
      return 'YOUTUBE';
    }
    throw new BadRequestError('Unsupported URL. Please provide a Reddit or YouTube URL.');
  }

  /**
   * Fetch metadata using yt-dlp --dump-json (works with both Reddit and YouTube)
   */
  private async fetchVideoMeta(url: string): Promise<{ id: string; title: string; author: string; subreddit?: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);

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
            let subreddit: string | undefined;
            if (/reddit/i.test(url)) {
              subreddit = meta.categories?.[0] || 'unknown';
            }
            resolve({
              id: meta.id || 'unknown',
              title: meta.title || meta.fulltitle || 'Untitled Video',
              author: meta.uploader || meta.channel || 'unknown',
              subreddit,
            });
          } catch (parseError) {
            reject(new BadRequestError(`Failed to parse video metadata: ${(parseError as Error).message}`));
          }
        } else {
          logger.error(`yt-dlp metadata dump failed (code ${code}): ${stderr}`);
          reject(new BadRequestError(`Invalid URL or video not found: ${stderr || 'yt-dlp exited with error'}`));
        }
      });

      child.on('error', (err) => {
        reject(new BadRequestError(`yt-dlp child process error: ${err.message}`));
      });
    });
  }

  /**
   * Downloads video + audio streams using `yt-dlp` and merges into MP4 (works for both Reddit and YouTube)
   */
  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Starting yt-dlp download for ${url}`);

      const args = [
        '-f',
        'bv*+ba/b', // Best video + best audio, fallback to best single stream
        '--merge-output-format',
        'mp4',
        '-o',
        outputPath,
        '--no-playlist',
        url,
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
   * Uploads local MP4 file to Hugging Face Storage Bucket using S3-compatible API
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
   * Initiate background process for video extraction and storage
   */
  async extractAndStoreVideo(userId: string, url: string) {
    // 1. Detect source and fetch metadata
    const source = this.detectSource(url);
    const meta = await this.fetchVideoMeta(url);

    // 2. Create PENDING video record in database
    const video = await prisma.video.create({
      data: {
        userId,
        source,
        url,
        postId: meta.id,
        title: meta.title,
        author: meta.author,
        subreddit: meta.subreddit,
        status: 'PENDING',
      },
    });

    // 3. Process video asynchronously in background
    this.processVideoPipeline(video.id, url, meta.id, source).catch((err) => {
      logger.error(`Background video processing failed for Video ID ${video.id}: ${err.message}`);
    });

    return video;
  }

  /**
   * Async pipeline worker: Download -> Upload to HF Bucket -> Clean local temp -> Update DB
   */
  private async processVideoPipeline(videoId: string, url: string, postId: string, source: VideoSource) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-'));
    const tempFilePath = path.join(tempDir, `${videoId}.mp4`);

    try {
      // Update status to PROCESSING
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'PROCESSING' },
      });

      // Step A: Download & merge with yt-dlp to temp location
      await this.downloadVideo(url, tempFilePath);

      // Get file size
      const stats = fs.statSync(tempFilePath);
      const fileSizeBytes = BigInt(stats.size);

      // Step B: Upload to Hugging Face Storage Bucket via S3 Gateway
      const prefix = source.toLowerCase();
      const remoteFileName = `${prefix}_${postId}_${videoId}.mp4`;
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
   * Get all video records for a specific user
   */
  async getUserVideos(userId: string) {
    return prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single video record by ID (enforce ownership)
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
   * Get a presigned download URL for a video from the Hugging Face Bucket
   */
  async getDownloadUrl(videoId: string, userId: string) {
    const video = await this.getVideoById(videoId, userId);

    if (video.status !== 'READY' || !video.hfBucketUri) {
      throw new BadRequestError('Video is not ready for download or missing URI');
    }

    logger.info(`getDownloadUrl: video.hfBucketUri = ${video.hfBucketUri}`);

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
    logger.info(`getDownloadUrl: parsed key = ${key}`);

    const command = new GetObjectCommand({
      Bucket: env.HF_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${key}"`,
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

export const videoService = new VideoService();
export default videoService;
