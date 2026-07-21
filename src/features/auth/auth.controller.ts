import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';

export const redirectToGoogle = (req: Request, res: Response): void => {
  // If a JWT token is supplied in the query, extract the userId and pass it
  // as the OAuth `state` parameter so we can link Brand Accounts to the
  // correct primary user on the callback without creating a duplicate record.
  let userId: string | undefined;

  const token = req.query.token as string | undefined;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      // Invalid/expired token — treat as a fresh unauthenticated login
    }
  }

  const url = authService.getAuthUrl(userId);
  res.redirect(url);
};

export const handleGoogleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, state } = req.query as { code: string; state?: string };
    const result = await authService.handleGoogleCallback(code, state);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

