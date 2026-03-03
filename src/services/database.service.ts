// @ts-nocheck
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../config/env.js';
import { Logger } from '../config/logger.js';
import { Memory, SearchQuery, SearchResult } from '../types/schemas.js';
import { DatabaseError, NotFoundError } from '../types/errors.js';

export interface Database {
  public: {
    Tables: {
      knowledge_vault: {
        Row: {
          id: string;
          content: string;
          embedding: number[];
          keywords: string[];
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          embedding: number[];
          keywords?: string[];
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          embedding?: number[];
          keywords?: string[];
          metadata?: Record<string, any>;
          updated_at?: string;
        };
      };
    };
  };
}

export class DatabaseService {
  private client: SupabaseClient<Database>;

  constructor(
    private env: Env,
    private logger: Logger
  ) {
    this.client = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing database connection');
      
      // Test connection
      const { error } = await this.client.from('knowledge_vault').select('id').limit(1);
      
      if (error) {
        throw new DatabaseError(`Database connection failed: ${error.message}`);
      }
      
      this.logger.info('Database connection established');
    } catch (error) {
      this.logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  async addMemory(memory: Memory): Promise<string> {
    try {
      this.logger.debug('Adding memory to database', { 
        contentLength: memory.content.length 
      });

      const { data, error } = await this.client
        .from('knowledge_vault')
        .insert({
          content: memory.content,
          embedding: memory.embedding!,
          keywords: memory.keywords || [],
          metadata: memory.metadata || {},
        })
        .select('id')
        .single();

      if (error) {
        throw new DatabaseError(`Failed to insert memory: ${error.message}`);
      }

      if (!data) {
        throw new DatabaseError('No data returned after insert');
      }

      this.logger.info('Memory added successfully', { id: data.id });
      return data.id;
    } catch (error) {
      this.logger.error('Failed to add memory', { error });
      throw error;
    }
  }

  async addMemories(memories: Memory[]): Promise<string[]> {
    try {
      this.logger.debug('Adding batch memories to database', { 
        count: memories.length 
      });

      const inserts = memories.map(m => ({
        content: m.content,
        embedding: m.embedding!,
        keywords: m.keywords || [],
        metadata: m.metadata || {},
      }));

      const { data, error } = await this.client
        .from('knowledge_vault')
        .insert(inserts)
        .select('id');

      if (error) {
        throw new DatabaseError(`Failed to insert memories: ${error.message}`);
      }

      if (!data) {
        throw new DatabaseError('No data returned after batch insert');
      }

      const ids = data.map(d => d.id);
      this.logger.info('Batch memories added successfully', { count: ids.length });
      return ids;
    } catch (error) {
      this.logger.error('Failed to add batch memories', { error });
      throw error;
    }
  }

  async searchMemories(query: SearchQuery, queryEmbedding: number[]): Promise<SearchResult[]> {
    try {
      this.logger.debug('Searching memories', { 
        queryLength: query.query.length,
        limit: query.limit,
        threshold: query.threshold 
      });

      const { data, error } = await this.client.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: query.threshold,
        match_count: query.limit,
      });

      if (error) {
        throw new DatabaseError(`Search failed: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      this.logger.info('Search completed', { resultsCount: data.length });
      
      return data.map(item => ({
        id: item.id,
        content: item.content,
        keywords: item.keywords,
        metadata: item.metadata,
        similarity: item.similarity,
        created_at: item.created_at,
      }));
    } catch (error) {
      this.logger.error('Failed to search memories', { error });
      throw error;
    }
  }

  async getMemoryById(id: string): Promise<Memory> {
    try {
      this.logger.debug('Fetching memory by ID', { id });

      const { data, error } = await this.client
        .from('knowledge_vault')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`Memory not found: ${id}`);
        }
        throw new DatabaseError(`Failed to fetch memory: ${error.message}`);
      }

      return {
        id: data.id,
        content: data.content,
        embedding: data.embedding,
        keywords: data.keywords,
        metadata: data.metadata,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      this.logger.error('Failed to get memory by ID', { error, id });
      throw error;
    }
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    try {
      this.logger.debug('Updating memory', { id });

      const updateData: Database['public']['Tables']['knowledge_vault']['Update'] = {
        updated_at: new Date().toISOString(),
      };

      if (updates.content) updateData.content = updates.content;
      if (updates.embedding) updateData.embedding = updates.embedding;
      if (updates.keywords) updateData.keywords = updates.keywords;
      if (updates.metadata) updateData.metadata = updates.metadata;

      const { error } = await this.client
        .from('knowledge_vault')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Failed to update memory: ${error.message}`);
      }

      this.logger.info('Memory updated successfully', { id });
    } catch (error) {
      this.logger.error('Failed to update memory', { error, id });
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      this.logger.debug('Deleting memory', { id });

      const { error } = await this.client
        .from('knowledge_vault')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Failed to delete memory: ${error.message}`);
      }

      this.logger.info('Memory deleted successfully', { id });
    } catch (error) {
      this.logger.error('Failed to delete memory', { error, id });
      throw error;
    }
  }

  async getMemoryCount(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('knowledge_vault')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new DatabaseError(`Failed to get memory count: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      this.logger.error('Failed to get memory count', { error });
      throw error;
    }
  }

  async getRecentMemories(limit: number = 10): Promise<Memory[]> {
    try {
      const { data, error } = await this.client
        .from('knowledge_vault')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new DatabaseError(`Failed to fetch recent memories: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get recent memories', { error });
      throw error;
    }
  }
}
