import { z } from 'zod';

export const googleCallbackSchema = z.object({
  query: z.object({
    code: z.string({ required_error: 'Google authorization code is required' }).min(1, 'Google authorization code cannot be empty'),
    state: z.string().optional(),
  }),
});

export const updateAccountPersonaSchema = z.object({
  params: z.object({
    accountId: z.string().uuid('Invalid account ID'),
  }),
  body: z.object({
    cardUsername: z.string().min(1).max(50).optional(),
    cardAvatarUrl: z.string().url('Must be a valid URL').optional().nullable(),
    contentTypeId: z.string().optional().nullable(),
    voices: z.array(
      z.object({
        voiceShortName: z.string().min(1),
        /** Speed multiplier: 0.75 = slow, 1 = normal, 1.25 / 1.5 / 1.75 / 2 = fast */
        rate: z.number().min(0.5).max(2).default(1),
        /**
         * Pitch offset in semitones — stored for future use.
         * Not yet applied during generation (edge-tts has no native pitch control).
         */
        pitch: z.number().min(-12).max(12).default(0),
      })
    ).max(5, 'Maximum 5 voices per persona').optional(),
  }).refine((d) => Object.keys(d).length > 0, {
    message: 'Provide at least one field to update',
  }),
});

export type GoogleCallbackQuery = z.infer<typeof googleCallbackSchema>;
export type UpdateAccountPersonaInput = z.infer<typeof updateAccountPersonaSchema>;
