import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { youtubeService } from './youtube.service.js';

export const getChannels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const channels = await youtubeService.getChannels(userId);
    res.status(200).json({
      status: 'success',
      results: channels.length,
      data: { channels },
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const stats = await youtubeService.getChannelStats(userId);
    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadVideo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, description, filePath, privacyStatus } = req.body;
    
    const result = await youtubeService.uploadVideo(userId, {
      title,
      description,
      filePath,
      privacyStatus,
    });
    
    res.status(201).json({
      status: 'success',
      data: { video: result },
    });
  } catch (error) {
    next(error);
  }
};
