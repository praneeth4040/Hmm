import { z } from 'zod';

export const generateTTSSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(5000),
    voice: z.string().min(1),
    /**
     * Speed as a multiplier (0.75 = slow, 1 = normal, 2 = fast).
     * Converted to edge-tts percentage offset: (rate - 1) * 100 %
     */
    rate: z.number().min(0.5).max(2).optional().default(1),
  }),
});

export type GenerateTTSRequest = z.infer<typeof generateTTSSchema>['body'];
