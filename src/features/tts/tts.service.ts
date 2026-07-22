import { Communicate } from 'edge-tts-universal';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/custom-errors.js';
import { TTS_VOICES, TTSVoiceId } from './tts.schema.js';

export class TTSService {
  async generateTTS(text: string, voiceId: TTSVoiceId, rate: number = 0): Promise<Buffer> {
    try {
      const voice = TTS_VOICES[voiceId];
      
      logger.info(`Generating TTS with voice: ${voiceId} (${voice}), rate: ${rate}`);

      const formattedRate = rate === 0 ? '+0%' : `${rate > 0 ? '+' : ''}${rate * 100}%`;
    const communicate = new Communicate(text, {
      voice,
      rate: formattedRate, // Convert to percentage format (e.g., +10%, -5%, +0%)
    });

      const chunks: Buffer[] = [];
      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          chunks.push(chunk.data);
        }
      }

      const audioBuffer = Buffer.concat(chunks);

      logger.info(`Generated TTS: ${audioBuffer.length} bytes`);
      return audioBuffer;
    } catch (err: any) {
      logger.error(`TTS generation failed: ${err.message}`);
      throw new BadRequestError(`TTS generation failed: ${err.message}`);
    }
  }

  listVoices() {
    return Object.entries(TTS_VOICES).map(([id, shortName]) => ({
      id,
      shortName,
      description: this.getVoiceDescription(id as TTSVoiceId),
    }));
  }

  private getVoiceDescription(id: TTSVoiceId) {
    switch (id) {
      case 'MOTHER': return 'Aged woman (mother)';
      case 'SISTER': return 'Middle-aged woman (sister)';
      case 'FATHER': return 'Aged man (father)';
      case 'BROTHER': return 'Teen boy (brother/me)';
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
