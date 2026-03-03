import 'dotenv/config';
import { validateEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { DatabaseService } from './services/database.service.js';
import { EmbeddingService } from './services/embedding.service.js';
import { MemoryService } from './services/memory.service.js';
import { MCPServer } from './services/mcp.service.js';

async function main() {
  // Validate environment
  const env = validateEnv();
  
  // Initialize logger
  const logger = createLogger(env);
  logger.info('Starting Second Brain MCP Server');

  try {
    // Initialize services
    logger.info('Initializing services...');
    
    const dbService = new DatabaseService(env, logger);
    await dbService.initialize();
    
    const embeddingService = new EmbeddingService(env, logger);
    const memoryService = new MemoryService(env, logger, dbService, embeddingService);
    const mcpServer = new MCPServer(env, logger, memoryService);

    logger.info('All services initialized successfully');

    // Setup stdin/stdout communication for MCP protocol
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      // Process complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const request = JSON.parse(line);
          const response = await mcpServer.handleRequest(request);
          
          // Send response via stdout
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (error) {
          logger.error('Failed to process request', { error, line });
          
          const errorResponse = {
            success: false,
            error: {
              code: 'PARSE_ERROR',
              message: 'Failed to parse request',
            },
          };
          
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    process.stdin.on('end', () => {
      logger.info('Input stream ended, shutting down');
      process.exit(0);
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    logger.info('MCP Server ready and listening on stdin/stdout');
    
    // Send ready signal
    process.stdout.write(JSON.stringify({
      success: true,
      data: { status: 'ready', version: '1.0.0' },
    }) + '\n');

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
