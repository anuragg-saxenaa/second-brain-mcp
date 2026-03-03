import { Env } from '../config/env.js';
import { Logger } from '../config/logger.js';
import { MemoryService } from './memory.service.js';
import {
  addMemoryRequestSchema,
  batchAddMemoriesSchema,
  searchQuerySchema,
  deleteMemorySchema,
  updateMemorySchema,
} from '../types/schemas.js';
import { ValidationError } from '../types/errors.js';

export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export class MCPServer {
  constructor(
    private env: Env,
    private logger: Logger,
    private memoryService: MemoryService
  ) {}

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      this.logger.info('Handling MCP request', { method: request.method });

      switch (request.method) {
        case 'memory.add':
          return await this.handleAddMemory(request.params);
        
        case 'memory.addBatch':
          return await this.handleAddBatchMemories(request.params);
        
        case 'memory.search':
          return await this.handleSearchMemories(request.params);
        
        case 'memory.get':
          return await this.handleGetMemory(request.params);
        
        case 'memory.update':
          return await this.handleUpdateMemory(request.params);
        
        case 'memory.delete':
          return await this.handleDeleteMemory(request.params);
        
        case 'memory.stats':
          return await this.handleGetStats();
        
        case 'memory.getContext':
          return await this.handleGetContext(request.params);
        
        case 'health':
          return this.handleHealth();
        
        default:
          throw new ValidationError(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      this.logger.error('MCP request failed', { error, method: request.method });
      return this.errorResponse(error);
    }
  }

  private async handleAddMemory(params?: Record<string, any>): Promise<MCPResponse> {
    const validated = addMemoryRequestSchema.parse(params);
    const id = await this.memoryService.addMemory(validated);
    
    return {
      success: true,
      data: { id, message: 'Memory added successfully' },
    };
  }

  private async handleAddBatchMemories(params?: Record<string, any>): Promise<MCPResponse> {
    const validated = batchAddMemoriesSchema.parse(params);
    const ids = await this.memoryService.addMemories(validated.memories);
    
    return {
      success: true,
      data: { ids, count: ids.length, message: 'Batch memories added successfully' },
    };
  }

  private async handleSearchMemories(params?: Record<string, any>): Promise<MCPResponse> {
    const validated = searchQuerySchema.parse(params);
    const results = await this.memoryService.searchMemories(validated);
    
    return {
      success: true,
      data: { results, count: results.length },
    };
  }

  private async handleGetMemory(params?: Record<string, any>): Promise<MCPResponse> {
    if (!params?.id) {
      throw new ValidationError('Memory ID is required');
    }
    
    const memory = await this.memoryService.getMemoryById(params.id);
    
    return {
      success: true,
      data: { memory },
    };
  }

  private async handleUpdateMemory(params?: Record<string, any>): Promise<MCPResponse> {
    const validated = updateMemorySchema.parse(params);
    await this.memoryService.updateMemory(validated);
    
    return {
      success: true,
      data: { message: 'Memory updated successfully' },
    };
  }

  private async handleDeleteMemory(params?: Record<string, any>): Promise<MCPResponse> {
    const validated = deleteMemorySchema.parse(params);
    await this.memoryService.deleteMemory(validated.id);
    
    return {
      success: true,
      data: { message: 'Memory deleted successfully' },
    };
  }

  private async handleGetStats(): Promise<MCPResponse> {
    const stats = await this.memoryService.getStats();
    
    return {
      success: true,
      data: stats,
    };
  }

  private async handleGetContext(params?: Record<string, any>): Promise<MCPResponse> {
    if (!params?.query) {
      throw new ValidationError('Query is required');
    }
    
    const context = await this.memoryService.getContextForLLM(
      params.query,
      params.limit || 5
    );
    
    return {
      success: true,
      data: { context },
    };
  }

  private handleHealth(): MCPResponse {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  private errorResponse(error: unknown): MCPResponse {
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
      },
    };
  }
}
