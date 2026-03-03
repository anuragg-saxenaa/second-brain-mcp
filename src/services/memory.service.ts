import { Env } from '../config/env.js';
import { Logger } from '../config/logger.js';
import { DatabaseService } from './database.service.js';
import { EmbeddingService } from './embedding.service.js';
import {
  AddMemoryRequest,
  SearchQuery,
  SearchResult,
  Memory,
  UpdateMemory,
} from '../types/schemas.js';
import { ValidationError } from '../types/errors.js';

export class MemoryService {
  constructor(
    private env: Env,
    private logger: Logger,
    private db: DatabaseService,
    private embedding: EmbeddingService
  ) {}

  async addMemory(request: AddMemoryRequest): Promise<string> {
    try {
      this.logger.info('Adding new memory', { 
        contentLength: request.content.length,
        autoExtractKeywords: request.auto_extract_keywords 
      });

      // Generate embedding
      const embeddingVector = await this.embedding.generateEmbedding(request.content);

      // Extract keywords if requested
      let keywords: string[] = [];
      if (request.auto_extract_keywords) {
        keywords = await this.embedding.extractKeywords(request.content);
      }

      // Create memory object
      const memory: Memory = {
        content: request.content,
        embedding: embeddingVector,
        keywords,
        metadata: {
          ...request.metadata,
          source: request.metadata?.source || 'api',
          processed_at: new Date().toISOString(),
        },
      };

      // Save to database
      const id = await this.db.addMemory(memory);

      this.logger.info('Memory added successfully', { id, keywordCount: keywords.length });
      return id;
    } catch (error) {
      this.logger.error('Failed to add memory', { error });
      throw error;
    }
  }

  async addMemories(requests: AddMemoryRequest[]): Promise<string[]> {
    try {
      this.logger.info('Adding batch memories', { count: requests.length });

      // Generate embeddings in batch
      const contents = requests.map(r => r.content);
      const embeddings = await this.embedding.generateBatchEmbeddings(contents);

      // Extract keywords for each (in parallel)
      const keywordsPromises = requests.map(r =>
        r.auto_extract_keywords
          ? this.embedding.extractKeywords(r.content)
          : Promise.resolve([])
      );
      const keywordsArray = await Promise.all(keywordsPromises);

      // Create memory objects
      const memories: Memory[] = requests.map((request, index) => ({
        content: request.content,
        embedding: embeddings[index],
        keywords: keywordsArray[index],
        metadata: {
          ...request.metadata,
          source: request.metadata?.source || 'api',
          processed_at: new Date().toISOString(),
        },
      }));

      // Save to database
      const ids = await this.db.addMemories(memories);

      this.logger.info('Batch memories added successfully', { count: ids.length });
      return ids;
    } catch (error) {
      this.logger.error('Failed to add batch memories', { error });
      throw error;
    }
  }

  async searchMemories(query: SearchQuery): Promise<SearchResult[]> {
    try {
      this.logger.info('Searching memories', { 
        query: query.query.substring(0, 50),
        limit: query.limit 
      });

      // Generate query embedding
      const queryEmbedding = await this.embedding.generateEmbedding(query.query);

      // Search database
      const results = await this.db.searchMemories(query, queryEmbedding);

      this.logger.info('Search completed', { 
        resultsCount: results.length,
        topSimilarity: results[0]?.similarity 
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to search memories', { error });
      throw error;
    }
  }

  async getMemoryById(id: string): Promise<Memory> {
    try {
      this.logger.debug('Fetching memory by ID', { id });
      return await this.db.getMemoryById(id);
    } catch (error) {
      this.logger.error('Failed to get memory', { error, id });
      throw error;
    }
  }

  async updateMemory(update: UpdateMemory): Promise<void> {
    try {
      this.logger.info('Updating memory', { id: update.id });

      const updates: Partial<Memory> = {};

      // If content is updated, regenerate embedding
      if (update.content) {
        updates.content = update.content;
        updates.embedding = await this.embedding.generateEmbedding(update.content);
        
        // Regenerate keywords if content changed
        updates.keywords = await this.embedding.extractKeywords(update.content);
      }

      if (update.keywords) {
        updates.keywords = update.keywords;
      }

      if (update.metadata) {
        updates.metadata = update.metadata;
      }

      await this.db.updateMemory(update.id, updates);

      this.logger.info('Memory updated successfully', { id: update.id });
    } catch (error) {
      this.logger.error('Failed to update memory', { error, id: update.id });
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      this.logger.info('Deleting memory', { id });
      await this.db.deleteMemory(id);
      this.logger.info('Memory deleted successfully', { id });
    } catch (error) {
      this.logger.error('Failed to delete memory', { error, id });
      throw error;
    }
  }

  async getStats(): Promise<{
    totalMemories: number;
    recentMemories: Memory[];
  }> {
    try {
      const [totalMemories, recentMemories] = await Promise.all([
        this.db.getMemoryCount(),
        this.db.getRecentMemories(5),
      ]);

      return {
        totalMemories,
        recentMemories,
      };
    } catch (error) {
      this.logger.error('Failed to get stats', { error });
      throw error;
    }
  }

  async getContextForLLM(query: string, limit: number = 5): Promise<string> {
    try {
      this.logger.info('Getting context for LLM', { query: query.substring(0, 50) });

      const results = await this.searchMemories({
        query,
        limit,
        threshold: this.env.VECTOR_SIMILARITY_THRESHOLD,
      });

      if (results.length === 0) {
        return 'No relevant context found in your Second Brain.';
      }

      const context = results
        .map((result, index) => {
          const keywords = result.keywords?.length 
            ? `\nKeywords: ${result.keywords.join(', ')}` 
            : '';
          return `[Memory ${index + 1}] (similarity: ${result.similarity.toFixed(3)})${keywords}\n${result.content}`;
        })
        .join('\n\n---\n\n');

      return `Relevant context from your Second Brain:\n\n${context}`;
    } catch (error) {
      this.logger.error('Failed to get context for LLM', { error });
      throw error;
    }
  }
}
