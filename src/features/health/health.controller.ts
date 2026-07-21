import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';

export const getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Quick raw query to ensure DB is reachable
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'success',
      message: 'System is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    next(error);
  }
};
