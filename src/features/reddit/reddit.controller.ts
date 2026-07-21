import { Request, Response, NextFunction } from 'express';
import { Video } from '@prisma/client';
import { redditService } from './reddit.service.js';

export const extractRedditVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { redditUrl } = req.body;

    const video = await redditService.extractAndStoreVideo(userId, redditUrl);

    res.status(202).json({
      status: 'success',
      message: 'Reddit video extraction started',
      data: {
        id: video.id,
        status: video.status,
        redditUrl: video.redditUrl,
        redditTitle: video.redditTitle,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserVideos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const videos = await redditService.getUserVideos(userId);

    // Convert BigInt fileSizeBytes to string to ensure JSON serialization works smoothly
    const serializedVideos = videos.map((v: Video) => ({
      ...v,
      fileSizeBytes: v.fileSizeBytes ? v.fileSizeBytes.toString() : null,
    }));

    res.status(200).json({
      status: 'success',
      data: serializedVideos,
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const video = await redditService.getVideoById(id, userId);

    res.status(200).json({
      status: 'success',
      data: {
        ...video,
        fileSizeBytes: video.fileSizeBytes ? video.fileSizeBytes.toString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const url = await redditService.getDownloadUrl(id, userId);

    // Redirect the client directly to the Hugging Face presigned URL
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};
