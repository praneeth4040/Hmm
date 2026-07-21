import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/custom-errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // If the error is a custom AppError
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message} on ${req.method} ${req.url}`);
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Otherwise, it is an unhandled/programming error
  logger.error(`Unhandled Error: ${err.message} on ${req.method} ${req.url}`, err);

  const message = env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(500).json({
    status: 'error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
