// Test script for video core functions (no database)
import dotenv from 'dotenv';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Test data - use real public URLs
const TEST_REDDIT_URL = 'https://www.reddit.com/r/videos/comments/198qz7/this_is_how_you_respond_to_a_bear_attack/';
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function fetchVideoMeta(url: string): Promise<{ id: string; title: string; author: string; subreddit?: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      if (code === 0 && stdout) {
        try {
          const meta = JSON.parse(stdout);
          let subreddit: string | undefined;
          if (/reddit/i.test(url)) {
            subreddit = meta.categories?.[0] || 'unknown';
          }
          resolve({
            id: meta.id || 'unknown',
            title: meta.title || meta.fulltitle || 'Untitled Video',
            author: meta.uploader || meta.channel || 'unknown',
            subreddit,
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse metadata: ${(parseError as Error).message}`));
        }
      } else {
        reject(new Error(`yt-dlp metadata failed (code ${code}): ${stderr}`));
      }
    });

    child.on('error', (err) => reject(new Error(`yt-dlp error: ${err.message}`)));
  });
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Starting download for ${url}...`);
    const args = [
      '-f', 'bv*+ba/b',
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      '--no-playlist',
      url
    ];
    const child = spawn('yt-dlp', args);
    let stderr = '';

    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`✅ Downloaded successfully to ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`Download failed (code ${code}): ${stderr}`));
      }
    });

    child.on('error', (err) => reject(new Error(`yt-dlp not found: ${err.message}`)));
  });
}

async function testVideoCore() {
  console.log('Testing Video Core Functions (No Database)');
  console.log('=========================================\n');

  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-test-'));
  console.log(`Created temp directory: ${tempDir}\n`);

  try {
    // 1. Test Reddit metadata
    console.log('1. Testing Reddit Metadata Fetch:');
    const redditMeta = await fetchVideoMeta(TEST_REDDIT_URL);
    console.log('   ✅ Success!');
    console.log('   ID:', redditMeta.id);
    console.log('   Title:', redditMeta.title);
    console.log('   Author:', redditMeta.author);
    console.log('   Subreddit:', redditMeta.subreddit);

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Test YouTube metadata
    console.log('2. Testing YouTube Metadata Fetch:');
    const youtubeMeta = await fetchVideoMeta(TEST_YOUTUBE_URL);
    console.log('   ✅ Success!');
    console.log('   ID:', youtubeMeta.id);
    console.log('   Title:', youtubeMeta.title);
    console.log('   Author:', youtubeMeta.author);

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Test Reddit download (shortened test for quick run - optional)
    console.log('3. Testing Reddit Video Download (this may take a minute):');
    const redditOutputPath = path.join(tempDir, 'test-reddit.mp4');
    await downloadVideo(TEST_REDDIT_URL, redditOutputPath);
    const redditStats = fs.statSync(redditOutputPath);
    console.log(`   File size: ${(redditStats.size / (1024 * 1024)).toFixed(2)} MB`);

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Test YouTube download (optional, can be skipped for speed)
    console.log('4. Testing YouTube Video Download (this may take a minute):');
    const youtubeOutputPath = path.join(tempDir, 'test-youtube.mp4');
    await downloadVideo(TEST_YOUTUBE_URL, youtubeOutputPath);
    const youtubeStats = fs.statSync(youtubeOutputPath);
    console.log(`   File size: ${(youtubeStats.size / (1024 * 1024)).toFixed(2)} MB`);

    console.log('\n=========================================');
    console.log('✅ All Video Core Tests Passed!');
  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    console.error('Stack:', (error as Error).stack);
  } finally {
    // Clean up temp directory
    console.log('\nCleaning up temp directory...');
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Temp directory cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Failed to clean up temp directory:', (cleanupError as Error).message);
    }
  }
}

testVideoCore().catch(console.error);
