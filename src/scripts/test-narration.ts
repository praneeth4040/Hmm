import { narrationService } from '../features/narration/narration.service.js';

async function testAutonomousNarration() {
  try {
    console.log('🤖 Testing FULLY AUTONOMOUS narration generation...');
    console.log('(No story details provided — AI will generate everything)\n');

    const categoryId = 'reddit-stories';
    console.log(`\n========== [${categoryId}] ==========`);

    const result = await narrationService.generateNarration({
      categoryId,
      // Notice: No storyDetails!
    });

    console.log('\n✅ Narration generated successfully!');
    console.log(`Model used: ${result.model}`);
    console.log(`Usage: promptTokens=${result.usage.promptTokens}, completionTokens=${result.usage.completionTokens}, totalTokens=${result.usage.totalTokens}`);
    console.log('\nNarration:\n');
    console.log(result.narration);
    console.log('\n🎉 Test complete!');
  } catch (error) {
    console.error('❌ Error generating narration:', error);
  }
}

testAutonomousNarration();
