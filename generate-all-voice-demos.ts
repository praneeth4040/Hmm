
import { VoicesManager, Communicate } from 'edge-tts-universal';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './src/utils/logger.js';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'tts-demos');

// Complicated test text to test the voice's capabilities
const TEST_TEXT = `Welcome to our dynamic text-to-speech demonstration! In a world where technology evolves at an unprecedented pace, the ability to convert written text into natural, expressive speech has become increasingly important. Whether you're developing applications for accessibility, creating engaging content for your audience, or simply exploring the fascinating realm of artificial intelligence, text-to-speech technology opens up a world of possibilities. 

Today, we're showcasing a variety of voices, each with its own unique character and tone. From warm and friendly to professional and authoritative, these voices are designed to bring your words to life. Let's embark on this auditory journey together and discover the perfect voice for your needs!`;

async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

async function generateVoiceDemos() {
  await ensureStorageDir();
  
  logger.info('Fetching all available voices...');
  const voicesManager = await VoicesManager.create();
  const allVoices = voicesManager.find({ Language: 'en' }); // Find only English voices
  
  logger.info(`Found ${allVoices.length} available voices!`);
  
  // Save voice list to JSON for reference
  const voiceListPath = path.join(STORAGE_DIR, 'available-voices.json');
  await fs.writeFile(voiceListPath, JSON.stringify(allVoices, null, 2));
  logger.info(`Voice list saved to ${voiceListPath}`);
  
  // Generate demos for all voices
  for (const voice of allVoices) {
    try {
      logger.info(`Generating demo for ${voice.ShortName} (${voice.Gender}, ${voice.Locale})...`);
      
      const communicate = new Communicate(TEST_TEXT, {
        voice: voice.ShortName,
        rate: '+0%'
      });
      
      const chunks: Buffer[] = [];
      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          chunks.push(chunk.data);
        }
      }
      
      const audioBuffer = Buffer.concat(chunks);
      const fileName = `${voice.Locale}-${voice.ShortName.split('-').pop()}-${voice.Gender}.mp3`;
      const filePath = path.join(STORAGE_DIR, fileName);
      await fs.writeFile(filePath, audioBuffer);
      logger.info(`Saved demo to ${filePath}`);
    } catch (err) {
      logger.error(`Failed to generate demo for ${voice.ShortName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  logger.info('All demos generated!');
}

generateVoiceDemos().catch(console.error);

