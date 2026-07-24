import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, BadRequestError } from '../../utils/custom-errors.js';
import { logger } from '../../utils/logger.js';

type VideoSource = 'REDDIT' | 'YOUTUBE';

// ─── In-memory edit session store ─────────────────────────────────────────────
// Maps sessionId → { filePath, userId, meta, createdAt }
// Files are cleaned up after SESSION_TTL_MS or when the session is consumed.

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

interface EditSession {
  filePath: string;
  userId: string;
  source: VideoSource;
  url: string;
  postId: string;
  title: string;
  author: string;
  subreddit?: string;
  createdAt: number;
}

const editSessions = new Map<string, EditSession>();

// Sweep expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of editSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      try {
        const dir = path.dirname(session.filePath);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      } catch { /* best-effort */ }
      editSessions.delete(id);
      logger.info(`Expired edit session cleaned up: ${id}`);
    }
  }
}, 10 * 60 * 1000);

export class VideoService {
  // ─── Private helpers ────────────────────────────────────────────────────────

  private detectSource(url: string): VideoSource {
    if (/reddit\.com/i.test(url)) return 'REDDIT';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE';
    throw new BadRequestError('Unsupported URL. Please provide a Reddit or YouTube URL.');
  }

  private async fetchVideoMeta(url: string): Promise<{ id: string; title: string; author: string; subreddit?: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (c) => { stdout += c.toString(); });
      child.stderr.on('data', (c) => { stderr += c.toString(); });
      child.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const meta = JSON.parse(stdout);
            resolve({
              id:        meta.id || 'unknown',
              title:     meta.title || meta.fulltitle || 'Untitled Video',
              author:    meta.uploader || meta.channel || 'unknown',
              subreddit: /reddit/i.test(url) ? (meta.categories?.[0] || 'unknown') : undefined,
            });
          } catch (e) {
            reject(new BadRequestError(`Failed to parse metadata: ${(e as Error).message}`));
          }
        } else {
          reject(new BadRequestError(`Invalid URL or video not found: ${stderr || 'yt-dlp error'}`));
        }
      });
      child.on('error', (e) => reject(new BadRequestError(`yt-dlp error: ${e.message}`)));
    });
  }

  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`yt-dlp download: ${url}`);
      const child = spawn('yt-dlp', [
        '-f', 'bv*+ba/b',
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        '--no-playlist',
        url,
      ]);
      let stderr = '';
      child.stderr.on('data', (c) => { stderr += c.toString(); });
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) resolve();
        else reject(new BadRequestError(`Download failed: ${stderr || 'yt-dlp error'}`));
      });
      child.on('error', (e) => reject(new BadRequestError(`yt-dlp not found: ${e.message}`)));
    });
  }

  private async uploadToHFBucket(localFilePath: string, remoteFileName: string): Promise<string> {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { Upload }   = await import('@aws-sdk/lib-storage');

    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: { accessKeyId: env.HF_S3_ACCESS_KEY_ID, secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    const uploader = new Upload({
      client: s3,
      params: {
        Bucket:      env.HF_BUCKET_NAME,
        Key:         remoteFileName,
        Body:        fs.createReadStream(localFilePath),
        ContentType: 'video/mp4',
      },
    });
    await uploader.done();
    const uri = `hf://buckets/${env.HF_NAMESPACE}/${env.HF_BUCKET_NAME}/${remoteFileName}`;
    logger.info(`Uploaded to HF: ${uri}`);
    return uri;
  }

  private async deleteFromHFBucket(hfBucketUri: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: { accessKeyId: env.HF_S3_ACCESS_KEY_ID, secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    const key = this.parseHfKey(hfBucketUri);
    await s3.send(new DeleteObjectCommand({ Bucket: env.HF_BUCKET_NAME, Key: key }));
    logger.info(`Deleted from HF: ${key}`);
  }

  private parseHfKey(hfBucketUri: string): string {
    return hfBucketUri.replace('hf://buckets/', '').split('/').slice(2).join('/');
  }

  private async ffmpegTrim(inputPath: string, outputPath: string, startSec: number, endSec: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = endSec - startSec;
      logger.info(`ffmpeg trim: ${startSec}s → ${endSec}s (${duration}s)`);
      const child = spawn('ffmpeg', [
        '-y', '-ss', String(startSec), '-i', inputPath,
        '-t', String(duration), '-c', 'copy', '-avoid_negative_ts', 'make_zero',
        outputPath,
      ]);
      let stderr = '';
      child.stderr.on('data', (c) => { stderr += c.toString(); });
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) resolve();
        else reject(new BadRequestError(`Trim failed: ${stderr || 'ffmpeg error'}`));
      });
      child.on('error', (e) => reject(new BadRequestError(`ffmpeg not found: ${e.message}`)));
    });
  }

  // ─── Edit-first flow ────────────────────────────────────────────────────────

  /**
   * Step 1 — Prepare: download video to a temp file, create an edit session.
   * Returns sessionId + metadata. Nothing is stored in DB or HF yet.
   */
  async prepareEditSession(userId: string, url: string): Promise<{
    sessionId: string;
    title: string;
    author: string;
    source: VideoSource;
  }> {
    const source = this.detectSource(url);
    const meta   = await this.fetchVideoMeta(url);

    const sessionId = `${userId.slice(-6)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'hmm-edit-'));
    const filePath  = path.join(tempDir, `${sessionId}.mp4`);

    await this.downloadVideo(url, filePath);

    editSessions.set(sessionId, {
      filePath,
      userId,
      source,
      url,
      postId:   meta.id,
      title:    meta.title,
      author:   meta.author,
      subreddit: meta.subreddit,
      createdAt: Date.now(),
    });

    logger.info(`Edit session created: ${sessionId} → ${filePath}`);
    return { sessionId, title: meta.title, author: meta.author, source };
  }

  /**
   * Get a validated edit session (ownership checked)
   */
  getEditSession(sessionId: string, userId: string): EditSession {
    const session = editSessions.get(sessionId);
    if (!session) throw new NotFoundError('Edit session not found or expired');
    if (session.userId !== userId) throw new NotFoundError('Edit session not found or expired');
    if (!fs.existsSync(session.filePath)) throw new BadRequestError('Session file missing — session may have expired');
    return session;
  }

  /**
   * Return the temp file path for streaming
   */
  getSessionFilePath(sessionId: string, userId: string): string {
    return this.getEditSession(sessionId, userId).filePath;
  }

  /**
   * Step 2 — Save: optionally trim, then upload to HF and create DB record.
   * Cleans up the temp session after success or failure.
   */
  async saveEditSession(
    sessionId: string,
    userId: string,
    trimOpts?: { startSec: number; endSec: number },
  ) {
    const session = this.getEditSession(sessionId, userId);

    let finalPath    = session.filePath;
    const tempTrimPath = session.filePath.replace('.mp4', '_trimmed.mp4');

    try {
      if (trimOpts) {
        await this.ffmpegTrim(session.filePath, tempTrimPath, trimOpts.startSec, trimOpts.endSec);
        finalPath = tempTrimPath;
      }

      const fileSizeBytes = BigInt(fs.statSync(finalPath).size);
      const prefix        = session.source.toLowerCase();
      const remoteKey     = `${prefix}_${session.postId}_${Date.now()}.mp4`;
      const hfBucketUri   = await this.uploadToHFBucket(finalPath, remoteKey);

      const video = await prisma.video.create({
        data: {
          userId,
          source:    session.source,
          url:       session.url,
          postId:    session.postId,
          title:     session.title,
          author:    session.author,
          subreddit: session.subreddit,
          hfBucketUri,
          fileSizeBytes,
          status: 'READY',
        },
      });

      logger.info(`Edit session ${sessionId} saved as Video ${video.id}`);
      return video;
    } finally {
      try {
        const dir = path.dirname(session.filePath);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      } catch { /* best-effort */ }
      editSessions.delete(sessionId);
    }
  }

  /**
   * Discard edit session (user cancelled) — clean up temp file
   */
  discardEditSession(sessionId: string, userId: string): void {
    const session = editSessions.get(sessionId);
    if (!session || session.userId !== userId) return;
    try {
      const dir = path.dirname(session.filePath);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch { /* best-effort */ }
    editSessions.delete(sessionId);
    logger.info(`Edit session discarded: ${sessionId}`);
  }

  // ─── Saved video library ────────────────────────────────────────────────────

  async getUserVideos(userId: string) {
    return prisma.video.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async getVideoById(videoId: string, userId: string) {
    const video = await prisma.video.findFirst({ where: { id: videoId, userId } });
    if (!video) throw new NotFoundError('Video record not found');
    return video;
  }

  async getDownloadUrl(videoId: string, userId: string) {
    const video = await this.getVideoById(videoId, userId);
    if (video.status !== 'READY' || !video.hfBucketUri) {
      throw new BadRequestError('Video is not ready for download');
    }

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl }               = await import('@aws-sdk/s3-request-presigner');

    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: `https://s3.hf.co/${env.HF_NAMESPACE}`,
      forcePathStyle: true,
      credentials: { accessKeyId: env.HF_S3_ACCESS_KEY_ID, secretAccessKey: env.HF_S3_SECRET_ACCESS_KEY },
    });

    const key     = this.parseHfKey(video.hfBucketUri);
    const command = new GetObjectCommand({
      Bucket: env.HF_BUCKET_NAME,
      Key:    key,
      ResponseContentDisposition: `attachment; filename="${key}"`,
    });
    return getSignedUrl(s3, command, { expiresIn: 3600 });
  }

  async deleteVideo(videoId: string, userId: string) {
    const video = await this.getVideoById(videoId, userId);
    if (video.hfBucketUri) await this.deleteFromHFBucket(video.hfBucketUri);
    await prisma.video.delete({ where: { id: videoId } });
    logger.info(`Deleted video ${videoId}`);
  }
}

export const videoService = new VideoService();
export default videoService;
