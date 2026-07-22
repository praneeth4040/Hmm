
import { TTSService } from './src/features/tts/tts.service.js';
import { TTSVoiceId } from './src/features/tts/tts.schema.js';
import fs from 'fs/promises';
import path from 'path';

async function test() {
    const tts = new TTSService();
    const voices: TTSVoiceId[] = ['MOTHER', 'SISTER', 'FATHER', 'BROTHER'];
    
    for (const voiceId of voices) {
        console.log(`Testing voiceId: ${voiceId}`);
        const buffer = await tts.generateTTS('Hello, this is a test.', voiceId, 0);
        
        const filePath = path.join('./storage/tts-demos', `test-${voiceId}.mp3`);
        await fs.writeFile(filePath, buffer);
        console.log(`Wrote ${filePath} (${buffer.length} bytes)`);
    }
}

test().catch(console.error);
