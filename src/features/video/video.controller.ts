import { Request, Response, NextFunction } from 'express';
import { Video } from '@prisma/client';
import { videoService } from './video.service.js';

export const extractVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { url } = req.body;

    const video = await videoService.extractAndStoreVideo(userId, url);

    res.status(202).json({
      status: 'success',
      message: 'Video extraction started',
      data: {
        id: video.id,
        status: video.status,
        url: video.url,
        title: video.title,
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
    const videos = await videoService.getUserVideos(userId);

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
    const { videoId } = req.params;

    const video = await videoService.getVideoById(videoId, userId);

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

export const getDownloadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { videoId } = req.params;

    const url = await videoService.getDownloadUrl(videoId, userId);

    // Redirect the client directly to the Hugging Face presigned URL
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};
