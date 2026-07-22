import { Request, Response, NextFunction } from 'express';
import { ttsService } from './tts.service.js';
import type { GenerateTTSRequest } from './tts.schema.js';

export const generateTTS = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { text, voiceId, rate } = req.body as GenerateTTSRequest;
    const audioBuffer = await ttsService.generateTTS(text, voiceId, rate);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="tts_output.mp3"');
    res.send(audioBuffer);
  } catch (err) {
    next(err);
  }
};

export const listVoices = (req: Request, res: Response) => {
  const voices = ttsService.listVoices();
  res.json({ voices });
};
