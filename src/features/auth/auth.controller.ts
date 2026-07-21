import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';

export const redirectToGoogle = (_req: Request, res: Response): void => {
  const url = authService.getAuthUrl();
  res.redirect(url);
};

export const handleGoogleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.query as { code: string };
    const result = await authService.handleGoogleCallback(code);
    
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
