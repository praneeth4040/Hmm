import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { Video } from '@prisma/client';
import { videoService } from './video.service.js';

// ─── Edit-first flow ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/video/prepare
 * Download video to a server-side temp session. Returns sessionId + metadata.
 * Nothing is stored in the DB or HF yet.
 */
export const prepareEdit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { url } = req.body;

    const result = await videoService.prepareEditSession(userId, url);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/video/session/:sessionId/stream
 * Stream the raw temp file to the client (supports Range headers for video seeking).
 */
export const streamSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId    = (req as any).user.id;
    const { sessionId } = req.params;

    const filePath = videoService.getSessionFilePath(sessionId, userId);
    const stat     = fs.statSync(filePath);
    const fileSize = stat.size;
    const range    = req.headers.range;

    if (range) {
      const parts  = range.replace(/bytes=/, '').split('-');
      const start  = parseInt(parts[0], 10);
      const end    = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   'video/mp4',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type':   'video/mp4',
        'Accept-Ranges':  'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/video/session/:sessionId/save
 * Optionally trim, then upload to HF and create DB record. Cleans up temp session.
 */
export const saveEdit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId        = (req as any).user.id;
    const { sessionId } = req.params;
    const { trim }      = req.body;

    const video = await videoService.saveEditSession(sessionId, userId, trim);

    res.status(201).json({
      status:  'success',
      message: 'Video saved successfully',
      data: {
        ...video,
        fileSizeBytes: video.fileSizeBytes ? video.fileSizeBytes.toString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/video/session/:sessionId
 * Discard an edit session without saving (user cancelled).
 */
export const discardSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId        = (req as any).user.id;
    const { sessionId } = req.params;

    videoService.discardEditSession(sessionId, userId);

    res.status(200).json({ status: 'success', message: 'Session discarded' });
  } catch (error) {
    next(error);
  }
};

// ─── Saved video library ──────────────────────────────────────────────────────

export const getUserVideos = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const videos = await videoService.getUserVideos(userId);

    res.status(200).json({
      status: 'success',
      data: videos.map((v: Video) => ({
        ...v,
        fileSizeBytes: v.fileSizeBytes ? v.fileSizeBytes.toString() : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId  = (req as any).user.id;
    const { videoId } = req.params;
    const video   = await videoService.getVideoById(videoId, userId);

    res.status(200).json({
      status: 'success',
      data: { ...video, fileSizeBytes: video.fileSizeBytes ? video.fileSizeBytes.toString() : null },
    });
  } catch (error) {
    next(error);
  }
};

export const getDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId      = (req as any).user.id;
    const { videoId } = req.params;
    const url         = await videoService.getDownloadUrl(videoId, userId);
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId      = (req as any).user.id;
    const { videoId } = req.params;
    await videoService.deleteVideo(videoId, userId);
    res.status(200).json({ status: 'success', message: 'Video deleted' });
  } catch (error) {
    next(error);
  }
};
