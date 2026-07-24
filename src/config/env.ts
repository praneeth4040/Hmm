import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection URL' }),
  JWT_SECRET: z.string().min(8, { message: 'JWT_SECRET must be at least 8 characters long' }),
  GOOGLE_CLIENT_ID: z.string().min(1, { message: 'GOOGLE_CLIENT_ID is required' }),
  GOOGLE_CLIENT_SECRET: z.string().min(1, { message: 'GOOGLE_CLIENT_SECRET is required' }),
  GOOGLE_REDIRECT_URI: z.string().url({ message: 'GOOGLE_REDIRECT_URI must be a valid URL' }),

  // Hugging Face Storage Bucket (S3 Gateway API)
  HF_NAMESPACE: z.string().min(1, { message: 'HF_NAMESPACE is required (e.g. Praneeth4040)' }),
  HF_BUCKET_NAME: z.string().min(1, { message: 'HF_BUCKET_NAME is required (e.g. videos)' }),
  HF_S3_ACCESS_KEY_ID: z.string().min(1, { message: 'HF_S3_ACCESS_KEY_ID is required (starts with HFAK...)' }),
  HF_S3_SECRET_ACCESS_KEY: z.string().min(1, { message: 'HF_S3_SECRET_ACCESS_KEY is required' }),

  // OpenRouter LLM API
  OPENROUTER_API_KEY: z.string().min(1, { message: 'OPENROUTER_API_KEY is required' }),
  OPENROUTER_DEFAULT_MODEL: z.string().default('google/gemini-flash-1.5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
