import { z } from "zod";

export const generateCardSchema = z.object({
  body: z.object({
    username: z.string().min(1).max(50).default("Redditor"),
    avatarUrl: z.string().url().optional(),
    title: z.string().max(200).optional(),
    text: z.string().min(1).max(1000),
  }),
});

export type GenerateCardInput = z.infer<typeof generateCardSchema>;
