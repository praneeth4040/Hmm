import { Request, Response, NextFunction } from "express";
import { cardService } from "./card.service.js";
import type { GenerateCardInput } from "./card.schema.js";

export const generateRedditCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = req.body as GenerateCardInput["body"];
    const pngBuffer = await cardService.generateRedditCard(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
};

export const generateXCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = req.body as GenerateCardInput["body"];
    const pngBuffer = await cardService.generateXCard(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
};
