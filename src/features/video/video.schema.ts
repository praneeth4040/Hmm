import { z } from 'zod';

export const prepareEditSchema = z.object({
  body: z.object({
    url: z.string({ required_error: 'url is required' }).url(),
  }),
});

export const saveEditSchema = z.object({
  params: z.object({
    sessionId: z.string({ required_error: 'sessionId is required' }),
  }),
  body: z.object({
    // trim is optional — omitting it saves the full video
    trim: z
      .object({
        startSec: z.number().min(0),
        endSec:   z.number().positive(),
      })
      .refine((d) => d.endSec > d.startSec, {
        message: 'endSec must be greater than startSec',
        path: ['endSec'],
      })
      .optional(),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string({ required_error: 'sessionId is required' }),
  }),
});

export const videoIdParamSchema = z.object({
  params: z.object({
    videoId: z.string({ required_error: 'videoId is required' }),
  }),
});

export type PrepareEditInput    = z.infer<typeof prepareEditSchema>;
export type SaveEditInput       = z.infer<typeof saveEditSchema>;
export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;
export type VideoIdParamInput   = z.infer<typeof videoIdParamSchema>;
