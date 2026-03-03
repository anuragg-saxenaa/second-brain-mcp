import OpenAI from 'openai';
import { Env } from '../config/env.js';
import { Logger } from '../config/logger.js';
import { EmbeddingError } from '../types/errors.js';

export class EmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(
    private env: Env,
    private logger: Logger
  ) {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_EMBEDDING_MODEL;
    this.dimensions = env.OPENAI_EMBEDDING_DIMENSIONS;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.debug('Generating embedding', { textLength: text.length });

      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError('No embedding returned from API');
      }

      const embedding = response.data[0].embedding;
      
      this.logger.debug('Embedding generated successfully', { 
        dimensions: embedding.length 
      });

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', { error });
      
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingError(
          `OpenAI API error: ${error.message} (status: ${error.status})`
        );
      }
      
      throw new EmbeddingError('Failed to generate embedding');
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.logger.debug('Generating batch embeddings', { count: texts.length });

      // OpenAI supports batch embeddings
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      if (!response.data || response.data.length !== texts.length) {
        throw new EmbeddingError('Batch embedding count mismatch');
      }

      const embeddings = response.data.map(item => item.embedding);
      
      this.logger.debug('Batch embeddings generated successfully', { 
        count: embeddings.length 
      });

      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate batch embeddings', { error });
      
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingError(
          `OpenAI API error: ${error.message} (status: ${error.status})`
        );
      }
      
      throw new EmbeddingError('Failed to generate batch embeddings');
    }
  }

  async extractKeywords(text: string): Promise<string[]> {
    try {
      this.logger.debug('Extracting keywords', { textLength: text.length });

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract 3-7 relevant keywords from the text. Return only a JSON array of strings, no explanation.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new EmbeddingError('No keywords returned from API');
      }

      // Parse JSON array
      const keywords = JSON.parse(content.trim());
      
      if (!Array.isArray(keywords)) {
        throw new EmbeddingError('Invalid keywords format');
      }

      this.logger.debug('Keywords extracted successfully', { 
        keywords: keywords.length 
      });

      return keywords.slice(0, 10); // Limit to 10 keywords max
    } catch (error) {
      this.logger.error('Failed to extract keywords', { error });
      
      // Fallback: return empty array instead of failing
      return [];
    }
  }
}
