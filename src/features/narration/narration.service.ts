import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/custom-errors.js';

// Resolve path to categories.json at runtime (works in both ESM and CJS)
const categoriesPath = join(__dirname, 'categories.json');
const config = JSON.parse(readFileSync(categoriesPath, 'utf-8'));

// Type definitions
export interface OriginalityConfig {
  level?: number;
  avoidClichés?: boolean;
  avoidRepeatedPlots?: boolean;
  avoidPredictableEndings?: boolean;
  encourageUniqueSituations?: boolean;
}

export interface GlobalDefaults {
  targetWords: number;
  perspective: string;
  tense: string;
  language: string;
  minWords: number;
  maxWords: number;
  profanity: string;
  originality: OriginalityConfig;
  outputFormat: string;
}

export interface ContentType {
  id: string;
  name: string;
  description: string;
  tone: string;
  themes: string[];
  exampleTopics: string[];
  defaults: Partial<GlobalDefaults>;
  narrationFramework: string;
  behavioralInstructions: string;
  originality: Partial<OriginalityConfig>;
}

export interface NarrationConfig {
  globalDefaults: GlobalDefaults;
  baseNarratorRole: string;
  contentTypes: ContentType[];
}

export interface GenerateNarrationRequest {
  categoryId: string;
  storyDetails?: string;
  model?: string;
  targetWords?: number;
  perspective?: string;
  tense?: string;
  language?: string;
  minWords?: number;
  maxWords?: number;
  profanity?: string;
  originality?: Partial<OriginalityConfig>;
}

export interface NarrationResult {
  narration: string;
  category: Pick<ContentType, 'id' | 'name' | 'tone'>;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class NarrationService {
  private readonly config: NarrationConfig;

  constructor() {
    this.config = config as NarrationConfig;
  }

  /**
   * Get all available narration categories with all config
   */
  listCategories() {
    return this.config.contentTypes.map(({ id, name, description, tone, themes, exampleTopics, defaults, narrationFramework, behavioralInstructions, originality }) => ({
      id,
      name,
      description,
      tone,
      themes,
      exampleTopics,
      defaults,
      narrationFramework,
      behavioralInstructions,
      originality,
    }));
  }

  /**
   * Get a single category by ID
   */
  getCategoryById(categoryId: string): ContentType {
    const category = this.config.contentTypes.find((c) => c.id === categoryId);
    if (!category) {
      throw new NotFoundError(
        `Category '${categoryId}' not found. Available categories: ${this.config.contentTypes.map((c) => c.id).join(', ')}`
      );
    }
    return category;
  }

  /**
   * Merge defaults: global -> category -> user provided
   */
  private mergeDefaults(
    category: ContentType,
    userOverrides: Partial<GenerateNarrationRequest>
  ): GlobalDefaults & Partial<GenerateNarrationRequest> {
    return {
      ...this.config.globalDefaults,
      ...category.defaults,
      ...userOverrides,
      originality: {
        ...this.config.globalDefaults.originality,
        ...category.originality,
        ...userOverrides.originality,
      },
    };
  }

  /**
   * Assemble the final prompt from modular components
   */
  private assemblePrompt(
    category: ContentType,
    config: GlobalDefaults & Partial<GenerateNarrationRequest>,
    storyDetails: string
  ): { systemPrompt: string; userPrompt: string } {
    // Build rules (objective constraints only)
    const rules = [
      `Perspective: ${config.perspective}`,
      `Tense: ${config.tense}`,
      `Language: ${config.language}`,
      `Word count: ${config.minWords}-${config.maxWords} words`,
      `Profanity: ${config.profanity}`,
      `Output format: ${config.outputFormat}`,
      `Originality level: ${config.originality.level}`,
      config.originality.avoidClichés ? 'Avoid clichés' : '',
      config.originality.avoidRepeatedPlots ? 'Avoid repeated plots' : '',
      config.originality.avoidPredictableEndings ? 'Avoid predictable endings' : '',
      config.originality.encourageUniqueSituations ? 'Encourage unique situations' : '',
    ].filter(Boolean).join('\n- ');

    // Build system prompt from components
    const systemPrompt = `${this.config.baseNarratorRole}
Tone: ${category.tone}

Content Type Instructions:
${category.behavioralInstructions}

Narration Framework:
${category.narrationFramework}

Rules:
- ${rules}`;

    // Build user prompt
    const userPrompt = `Story Details:
${storyDetails}

Please generate a narration script following all the instructions above.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Generate story details (premise) for a given category
   */
  async generateStoryDetails(categoryId: string, model?: string, maxRetries = 3): Promise<string> {
    const category = this.getCategoryById(categoryId);
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const selectedThemes = category.themes
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .join(', ');

        logger.info(`Generating story details for [${category.name}] using themes: ${selectedThemes} (attempt ${attempt + 1}/${maxRetries})`);

        const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/praneeth4040/hmm',
            'X-Title': 'Project Y',
          },
          body: JSON.stringify({
            model: model || env.OPENROUTER_DEFAULT_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a creative premise generator for YouTube story videos. Generate a compelling, specific story premise (3-5 sentences) based on the given content type and themes. Do NOT write a full narration—just the core premise/story details. Make it unique, interesting, and emotional. DO NOT return an empty response.',
              },
              {
                role: 'user',
                content: `Content Type: ${category.name}\nThemes: ${selectedThemes}\nExample Topics: ${category.exampleTopics.join(', ')}\n\nGenerate a story premise.`,
              },
            ],
            max_tokens: 300,
            temperature: 1.0,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error(`OpenRouter API error (${response.status}): ${errorBody}`);
          throw new BadRequestError(`OpenRouter API error: ${response.statusText} — ${errorBody}`);
        }

        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>;
          error?: { message: string };
        };

        if (data.error) {
          throw new BadRequestError(`OpenRouter returned an error: ${data.error.message}`);
        }

        const storyDetails = data.choices?.[0]?.message?.content?.trim();
        if (storyDetails && storyDetails.length > 0) {
          return storyDetails;
        }

        logger.warn(`Attempt ${attempt + 1}: LLM returned empty story details, retrying...`);
      } catch (error) {
        logger.warn(`Attempt ${attempt + 1} failed: ${error}`);
        lastError = error;
        if (attempt < maxRetries - 1) {
          // Wait a little before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new BadRequestError(`Failed to generate story details after ${maxRetries} attempts: ${lastError}`);
  }

  /**
   * Generate a narration script
   */
  async generateNarration(request: GenerateNarrationRequest): Promise<NarrationResult> {
    let { categoryId, storyDetails, model = env.OPENROUTER_DEFAULT_MODEL } = request;

    // Load and validate category
    const category = this.getCategoryById(categoryId);
    const config = this.mergeDefaults(category, request);

    // If no storyDetails provided, generate them automatically
    if (!storyDetails || storyDetails.trim().length === 0) {
      logger.info('No story details provided—generating automatically...');
      storyDetails = await this.generateStoryDetails(categoryId, model, 3);
    }

    logger.info(`Generating [${category.name}] narration via OpenRouter (model: ${model}, ~${config.targetWords} words)`);

    // Assemble prompt
    const { systemPrompt, userPrompt } = this.assemblePrompt(category, config, storyDetails);

    // Call OpenRouter
    const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/praneeth4040/hmm',
        'X-Title': 'Project Y',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Math.ceil(config.targetWords * 2.5), // Bumped from 1.6 to 2.5 to prevent cutoffs
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
