import { Communicate, VoicesManager, type Voice } from 'edge-tts-universal';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/custom-errors.js';

export class TTSService {
  private voicesManager: VoicesManager | null = null;

  // Helper to initialize or get VoicesManager
  private async getVoicesManager(): Promise<VoicesManager> {
    if (!this.voicesManager) {
      this.voicesManager = await VoicesManager.create();
    }
    return this.voicesManager;
  }

  async generateTTS(text: string, voice: string, rate: number = 1): Promise<Buffer> {
    try {
      logger.info(`Generating TTS with voice: ${voice}, rate: ${rate}x`);

      // Convert multiplier to edge-tts percentage offset: (rate - 1) * 100
      // e.g. 1x → +0%, 1.25x → +25%, 0.75x → -25%
      const pct = Math.round((rate - 1) * 100);
      const formattedRate = pct === 0 ? '+0%' : `${pct > 0 ? '+' : ''}${pct}%`;

      const communicate = new Communicate(text, {
        voice,
        rate: formattedRate,
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

  async listVoices(): Promise<Voice[]> {
    const manager = await this.getVoicesManager();
    // Return all English voices
    return manager.find({ Language: 'en' });
  }
}

export const ttsService = new TTSService();
export default ttsService;
