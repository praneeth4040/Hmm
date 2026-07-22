import { z } from "zod";

export const captionStyleSchema = z.object({
  fontName: z.string().optional().default("Arial"),
  fontSize: z.number().int().min(8).max(200).optional().default(48),
  primaryColor: z.string().optional().default("white"),
  secondaryColor: z.string().optional(),
  outlineColor: z.string().optional().default("black"),
  outlineWidth: z.number().min(0).max(10).optional().default(2),
  backColor: z.string().optional(),
  alignment: z.enum(["bottom-left", "bottom-center", "bottom-right", "middle-left", "middle-center", "middle-right", "top-left", "top-center", "top-right"]).optional().default("bottom-center"),
  bold: z.boolean().optional().default(false),
  italic: z.boolean().optional().default(false),
  underline: z.boolean().optional().default(false),
});

export const captionSegmentSchema = z.object({
  text: z.string().min(1, "Caption text cannot be empty").max(500, "Caption text is too long"),
  startTime: z.number().min(0, "Start time must be positive (seconds)"),
  endTime: z.number().min(0, "End time must be positive (seconds)"),
});

export const addCaptionsSchema = z.object({
  params: z.object({
    videoId: z.string({ required_error: "Video ID parameter is required" }),
  }),
  body: z.object({
    captions: z.array(captionSegmentSchema).min(1, "At least one caption segment is required"),
    style: captionStyleSchema.optional(),
  }),
});

export type AddCaptionsInput = z.infer<typeof addCaptionsSchema>;
export type CaptionSegment = z.infer<typeof captionSegmentSchema>;
export type CaptionStyle = z.infer<typeof captionStyleSchema>;
