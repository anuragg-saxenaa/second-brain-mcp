import { z } from 'zod';

// Environment variable schema for Slack function
export const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(Deno.env.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Request schema for Slack event
export const slackEventSchema = z.object({
  event: z.object({
    type: z.string().default('message'),
    text: z.string().optional(),
    user: z.string().optional(),
    channel: z.string().optional(),
  }).optional(),
  challenge: z.string().optional(),
  token: z.string().optional(),
});

export type SlackEvent = z.infer<typeof slackEventSchema>;

// Memory schema for storage
export const memorySchema = z.object({
  content: z.string().min(1),
  embedding: z.array(z.number()).min(1),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type Memory = z.infer<typeof memorySchema>;

// Function to generate embedding
export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.EMBEDDING_MODEL,
      input: text,
      dimensions: env.EMBEDDING_DIMENSIONS,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// Function to extract keywords
export async function extractKeywords(
  text: string,
  env: Env
): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-7 relevant keywords from the text. Return only a JSON array of strings.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    }),
  });

  const data = await response.json();
  const keywordsText = data.choices[0]?.message?.content || '[]';
  return JSON.parse(keywordsText);
}

// Function to store memory in Supabase
export async function storeMemory(
  memory: Memory,
  env: Env
): Promise<void> {
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from('knowledge_vault').insert(memory);

  if (error) {
    throw new Error(`Failed to store memory: ${error.message}`);
  }
}

// Main processing function
export async function processSlackMessage(
  event: SlackEvent['event'],
  env: Env
): Promise<void> {
  if (!event?.text || !event?.user || !event?.channel) {
    throw new Error('Invalid event data');
  }

  const text = event.text;

  // Generate embedding
  const embedding = await generateEmbedding(text, env);

  // Extract keywords
  const keywords = await extractKeywords(text, env);

  // Create memory object
  const memory: Memory = {
    content: text,
    embedding,
    keywords,
    metadata: {
      source: 'slack',
      user: event.user,
      channel: event.channel,
      processed_at: new Date().toISOString(),
    },
  };

  // Store in database
  await storeMemory(memory, env);
}

// Error classes
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class OpenAIError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}
