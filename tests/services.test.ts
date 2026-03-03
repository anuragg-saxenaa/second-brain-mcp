import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateEnv } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { DatabaseService } from '../src/services/database.service.js';
import { EmbeddingService } from '../src/services/embedding.service.js';
import { MemoryService } from '../src/services/memory.service.js';
import { MCPServer } from '../src/services/mcp.service.js';

// Mock Supabase client
describe('DatabaseService', () => {
  let dbService;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ id: 'test-id' }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ id: 'test-id' }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            update: vi.fn().mockResolvedValue({}),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            delete: vi.fn().mockResolvedValue({}),
          }),
        }),
        rpc: vi.fn().mockResolvedValue({
          data: [{ id: 'test-id', similarity: 0.8 }],
        }),
      }),
    };

    vi.mock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue(mockClient),
    }));

    dbService = new DatabaseService(
      { SUPABASE_URL: 'test', SUPABASE_SERVICE_ROLE_KEY: 'test' } as any,
      { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any
    );
  });

  it('should initialize database connection', async () => {
    await dbService.initialize();
    expect(mockClient.from).toHaveBeenCalledWith('knowledge_vault');
  });

  it('should add memory to database', async () => {
    const memory = {
      content: 'Test memory',
      embedding: new Array(1536).fill(0.5),
      keywords: ['test'],
    };

    const id = await dbService.addMemory(memory);
    expect(id).toBe('test-id');
  });

  it('should search memories', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    const results = await dbService.searchMemories(
      { query: 'test', limit: 5, threshold: 0.7 } as any,
      queryEmbedding
    );
    expect(results).toHaveLength(1);
  });
});

// Mock OpenAI client
describe('EmbeddingService', () => {
  let embeddingService;
  let mockOpenAI;

  beforeEach(() => {
    mockOpenAI = {
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.5) }],
        }),
      },
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '[]' } }],
          }),
        },
      },
    };

    vi.mock('openai', () => {
      return vi.fn().mockImplementation(() => mockOpenAI);
    });

    embeddingService = new EmbeddingService(
      { OPENAI_API_KEY: 'test' } as any,
      { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any
    );
  });

  it('should generate embedding', async () => {
    const embedding = await embeddingService.generateEmbedding('test');
    expect(embedding).toHaveLength(1536);
  });

  it('should extract keywords', async () => {
    const keywords = await embeddingService.extractKeywords('test');
    expect(keywords).toEqual([]);
  });
});

// Memory service tests
describe('MemoryService', () => {
  let memoryService;
  let mockDbService;
  let mockEmbeddingService;

  beforeEach(() => {
    mockDbService = {
      addMemory: vi.fn().mockResolvedValue('test-id'),
      addMemories: vi.fn().mockResolvedValue(['id1', 'id2']),
      searchMemories: vi.fn().mockResolvedValue([]),
      getMemoryById: vi.fn().mockResolvedValue({ id: 'test-id' }),
      updateMemory: vi.fn().mockResolvedValue(),
      deleteMemory: vi.fn().mockResolvedValue(),
      getMemoryCount: vi.fn().mockResolvedValue(10),
      getRecentMemories: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.5)),
      generateBatchEmbeddings: vi.fn().mockResolvedValue([
        new Array(1536).fill(0.5),
        new Array(1536).fill(0.5),
      ]),
      extractKeywords: vi.fn().mockResolvedValue(['test']),
    };

    memoryService = new MemoryService(
      {} as any,
      { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any,
      mockDbService,
      mockEmbeddingService
    );
  });

  it('should add memory with embedding and keywords', async () => {
    const id = await memoryService.addMemory({
      content: 'test',
      auto_extract_keywords: true,
    });

    expect(id).toBe('test-id');
    expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('test');
    expect(mockEmbeddingService.extractKeywords).toHaveBeenCalledWith('test');
  });

  it('should search memories with embedding', async () => {
    const results = await memoryService.searchMemories({
      query: 'test',
      limit: 5,
      threshold: 0.7,
    });

    expect(results).toEqual([]);
    expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('test');
  });

  it('should get context for LLM', async () => {
    const context = await memoryService.getContextForLLM('test');
    expect(context).toContain('No relevant context found');
  });
});

// MCP server tests
describe('MCPServer', () => {
  let mcpServer;
  let mockMemoryService;

  beforeEach(() => {
    mockMemoryService = {
      addMemory: vi.fn().mockResolvedValue('test-id'),
      searchMemories: vi.fn().mockResolvedValue([]),
      getMemoryById: vi.fn().mockResolvedValue({ id: 'test-id' }),
      updateMemory: vi.fn().mockResolvedValue(),
      deleteMemory: vi.fn().mockResolvedValue(),
      getStats: vi.fn().mockResolvedValue({ totalMemories: 10, recentMemories: [] }),
      getContextForLLM: vi.fn().mockResolvedValue('No context'),
    };

    mcpServer = new MCPServer(
      {} as any,
      { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any,
      mockMemoryService
    );
  });

  it('should handle add memory request', async () => {
    const response = await mcpServer.handleRequest({
      method: 'memory.add',
      params: { content: 'test' },
    });

    expect(response.success).toBe(true);
    expect(response.data.id).toBe('test-id');
  });

  it('should handle search memories request', async () => {
    const response = await mcpServer.handleRequest({
      method: 'memory.search',
      params: { query: 'test' },
    });

    expect(response.success).toBe(true);
    expect(response.data.results).toEqual([]);
  });

  it('should handle unknown method', async () => {
    const response = await mcpServer.handleRequest({
      method: 'unknown.method',
    });

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });
});
