import { z } from 'zod';

export const generateNarrationSchema = z.object({
  body: z.object({
    // Category ID from categories.json (e.g. "horror", "comedy", "revenge")
    categoryId: z
      .string({ required_error: 'categoryId is required' })
      .min(1, 'categoryId cannot be empty'),

    // The specific story details / context to personalize the narration
    storyDetails: z
      .string({ required_error: 'storyDetails is required' })
      .min(10, 'storyDetails must be at least 10 characters')
      .max(2000, 'storyDetails cannot exceed 2000 characters'),

    // Optional: override the LLM model (defaults to the category default)
    model: z.string().optional(),

    // Optional: override the target word count (defaults to category default)
    targetWords: z.coerce.number().min(50).max(1000).optional(),
  }),
});

export type GenerateNarrationInput = z.infer<typeof generateNarrationSchema>;
