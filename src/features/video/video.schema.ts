import { z } from 'zod';

export const extractVideoSchema = z.object({
  body: z.object({
    url: z.string({ required_error: 'URL is required' }).url(),
  }),
});

export type ExtractVideoInput = z.infer<typeof extractVideoSchema>;
