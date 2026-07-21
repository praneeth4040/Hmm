import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/custom-errors.js';

// Resolve path to categories.json at runtime (works in both ESM and CJS)
const categoriesPath = join(__dirname, 'categories.json');
const categories: NarrationCategory[] = JSON.parse(readFileSync(categoriesPath, 'utf-8'));

// OpenRouter API base URL (OpenAI-compatible)
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Default model used when none specified
const DEFAULT_MODEL = 'google/gemini-flash-1.5';

export interface NarrationCategory {
  id: string;
  name: string;
  description: string;
  tone: string;
  defaultTargetWords: number;
  exampleTopics: string[];
  systemPrompt: string;
  userPromptTemplate: string;
}

export interface GenerateNarrationRequest {
  categoryId: string;
  storyDetails: string;
  model?: string;
  targetWords?: number;
}

export interface NarrationResult {
  narration: string;
  category: Pick<NarrationCategory, 'id' | 'name' | 'tone'>;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class NarrationService {
  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/projecty',
      'X-Title': 'Project Y',
    };
  }

  /**
   * Get all available narration categories (without the raw prompt internals).
   */
  listCategories() {
    return categories.map(({ id, name, description, tone, defaultTargetWords, exampleTopics }) => ({
      id,
      name,
      description,
      tone,
      defaultTargetWords,
      exampleTopics,
    }));
  }

  /**
   * Get a single category by ID.
   */
  getCategoryById(categoryId: string): NarrationCategory {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new NotFoundError(
        `Category '${categoryId}' not found. Available categories: ${categories.map((c) => c.id).join(', ')}`
      );
    }
    return category;
  }

  /**
   * Generate a narration script using the category's prompt template + user story details.
   */
  async generateNarration(request: GenerateNarrationRequest): Promise<NarrationResult> {
    const { categoryId, storyDetails, model = DEFAULT_MODEL } = request;

    // Load and validate category
    const category = this.getCategoryById(categoryId);
    const targetWords = request.targetWords ?? category.defaultTargetWords;

    // Build the user prompt from the category template
    const userPrompt = category.userPromptTemplate
      .replace('{{targetWords}}', String(targetWords))
      .replace('{{storyDetails}}', storyDetails);

    logger.info(`Generating [${category.name}] narration via OpenRouter (model: ${model}, ~${targetWords} words)`);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: category.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Math.ceil(targetWords * 1.6),
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`OpenRouter API error (${response.status}): ${errorBody}`);
      throw new BadRequestError(`OpenRouter API error: ${response.statusText} — ${errorBody}`);
    }

    const data = await response.json() as {
      model: string;
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      error?: { message: string };
    };

    if (data.error) {
      throw new BadRequestError(`OpenRouter returned an error: ${data.error.message}`);
    }

    const narration = data.choices?.[0]?.message?.content?.trim();
    if (!narration) {
      throw new BadRequestError('LLM returned an empty narration response');
    }

    const usage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    logger.info(`[${category.name}] narration generated (${usage.totalTokens} tokens, model: ${data.model})`);

    return {
      narration,
      category: { id: category.id, name: category.name, tone: category.tone },
      model: data.model ?? model,
      usage,
    };
  }
}

export const narrationService = new NarrationService();
export default narrationService;
