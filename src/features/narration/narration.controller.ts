import { Request, Response, NextFunction } from 'express';
import { narrationService } from './narration.service.js';

/**
 * GET /api/v1/narration/categories
 * Returns all available narration categories with metadata.
 */
export const listCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = narrationService.listCategories();
    res.status(200).json({
      status: 'success',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/narration/generate
 * Generates a narration script for the given category and story details.
 */
export const generateNarration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { categoryId, storyDetails, model, targetWords } = req.body;

    const result = await narrationService.generateNarration({
      categoryId,
      storyDetails,
      model,
      targetWords,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
