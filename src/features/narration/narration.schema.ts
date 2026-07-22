import { z } from 'zod';

export const generateNarrationSchema = z.object({
  body: z.object({
    categoryId: z.string({ required_error: 'categoryId is required' }).min(1),
    storyDetails: z.string().min(10).max(2000).optional(), // Now optional!
    model: z.string().optional(),
    targetWords: z.coerce.number().min(100).max(2000).optional(),
    perspective: z.enum(['first_person', 'second_person', 'third_person']).optional(),
    tense: z.enum(['past', 'present', 'future']).optional(),
    language: z.string().optional(),
    minWords: z.coerce.number().min(100).max(2000).optional(),
    maxWords: z.coerce.number().min(100).max(2000).optional(),
    profanity: z.enum(['allow', 'optional', 'forbid']).optional(),
    originality: z.object({
      level: z.number().min(0).max(1).optional(),
      avoidClichés: z.boolean().optional(),
      avoidRepeatedPlots: z.boolean().optional(),
      avoidPredictableEndings: z.boolean().optional(),
      encourageUniqueSituations: z.boolean().optional(),
    }).optional(),
  }),
});

export type GenerateNarrationInput = z.infer<typeof generateNarrationSchema>;
