import { z } from 'zod';

export const TTS_VOICES = {
  MOTHER: 'en-US-JennyNeural', // Aged woman (mother)
  SISTER: 'en-US-AriaNeural',  // Middle-aged woman (sister)
  FATHER: 'en-US-GuyNeural',   // Aged man (father)
  BROTHER: 'en-US-EricNeural', // Teen boy (brother/me)
} as const;

export const generateTTSSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(5000),
    voiceId: z.enum(Object.keys(TTS_VOICES) as [keyof typeof TTS_VOICES, ...Array<keyof typeof TTS_VOICES>]),
    rate: z.number().min(-0.5).max(0.5).optional().default(0), // Speech rate: -0.5 to 0.5 (slow to fast)
  }),
});

export type GenerateTTSRequest = z.infer<typeof generateTTSSchema>['body'];
export type TTSVoiceId = keyof typeof TTS_VOICES;
