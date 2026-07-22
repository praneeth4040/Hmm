import { z } from 'zod';

export const generateTTSSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(5000),
    voice: z.string().min(1), // Accept any voice short name (e.g., 'en-US-AriaNeural')
    rate: z.number().min(-0.5).max(0.5).optional().default(0), // Speech rate: -0.5 to 0.5 (slow to fast)
  }),
});

export type GenerateTTSRequest = z.infer<typeof generateTTSSchema>['body'];
