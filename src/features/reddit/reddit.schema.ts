import { z } from 'zod';

export const extractRedditVideoSchema = z.object({
  body: z.object({
    redditUrl: z
      .string({ required_error: 'redditUrl is required' })
      .url('redditUrl must be a valid URL')
      .refine(
        (url) => url.includes('reddit.com') || url.includes('redd.it'),
        { message: 'URL must be a valid Reddit post URL' }
      ),
  }),
});

export const getVideoStatusSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Video ID parameter is required' }),
  }),
});

export type ExtractRedditVideoInput = z.infer<typeof extractRedditVideoSchema>;
export type GetVideoStatusInput = z.infer<typeof getVideoStatusSchema>;
