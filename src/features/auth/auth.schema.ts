import { z } from 'zod';

export const googleCallbackSchema = z.object({
  query: z.object({
    code: z.string({ required_error: 'Google authorization code is required' }).min(1, 'Google authorization code cannot be empty'),
    state: z.string().optional(),
  }),
});

export type GoogleCallbackQuery = z.infer<typeof googleCallbackSchema>;
