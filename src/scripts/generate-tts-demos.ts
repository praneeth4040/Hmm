
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ttsService } from '../features/tts/tts.service.js';
import { TTSVoiceId } from '../features/tts/tts.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_TEXT = "Hello there! I'm your story narrator. Let me bring your tales to life with my voice.";

async function generateDemos() {
  console.log('Generating TTS demo files...');

  const voices: TTSVoiceId[] = ['MOTHER', 'SISTER', 'FATHER', 'BROTHER'];

  for (const voiceId of voices) {
    try {
      console.log(`Generating demo for voice: ${voiceId}`);
      const buffer = await ttsService.generateTTS(DEMO_TEXT, voiceId, 0);
      const outputPath = path.join(__dirname, '../../storage/tts-demos', `${voiceId.toLowerCase()}.mp3`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Saved demo to: ${outputPath}`);
    } catch (err) {
      console.error(`Failed to generate demo for ${voiceId}:`, err);
    }
  }

  console.log('All demos generated successfully!');
}

generateDemos().catch(console.error);
