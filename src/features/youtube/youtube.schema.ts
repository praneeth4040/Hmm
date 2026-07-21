import { z } from 'zod';

export const uploadVideoSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
    description: z.string().default(''),
    filePath: z.string({ required_error: 'Local filePath is required' }).min(1, 'Local filePath cannot be empty'),
    privacyStatus: z.enum(['public', 'private', 'unlisted']).default('private'),
  }),
});

export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;
