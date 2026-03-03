#!/usr/bin/env node

/**
 * CLI tool for interacting with Second Brain MCP Server
 * Usage: node cli.js <command> [options]
 */

import 'dotenv/config';
import { createInterface } from 'readline';
import { validateEnv } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { DatabaseService } from '../src/services/database.service.js';
import { EmbeddingService } from '../src/services/embedding.service.js';
import { MemoryService } from '../src/services/memory.service.js';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  const env = validateEnv();
  const logger = createLogger(env);
  
  // Initialize services
  const dbService = new DatabaseService(env, logger);
  await dbService.initialize();
  
  const embeddingService = new EmbeddingService(env, logger);
  const memoryService = new MemoryService(env, logger, dbService, embeddingService);

  const command = process.argv[2];

  try {
    switch (command) {
      case 'add':
        await addMemory(memoryService);
        break;
      
      case 'search':
        await searchMemories(memoryService);
        break;
      
      case 'stats':
        await showStats(memoryService);
        break;
      
      case 'interactive':
        await interactiveMode(memoryService);
        break;
      
      case 'list':
        await listRecent(memoryService);
        break;
      
      default:
        showHelp();
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function addMemory(memoryService) {
  const content = process.argv[3] || await question('Enter memory content: ');
  
  if (!content) {
    console.error('Content is required');
    process.exit(1);
  }

  console.log('Adding memory...');
  const id = await memoryService.addMemory({
    content,
    auto_extract_keywords: true,
  });

  console.log(`✓ Memory added successfully with ID: ${id}`);
}

async function searchMemories(memoryService) {
  const query = process.argv[3] || await question('Enter search query: ');
  
  if (!query) {
    console.error('Query is required');
    process.exit(1);
  }

  console.log('Searching...\n');
  const results = await memoryService.searchMemories({
    query,
    limit: 5,
    threshold: 0.7,
  });

  if (results.length === 0) {
    console.log('No results found.');
    return;
  }

  results.forEach((result, index) => {
    console.log(`\n[${index + 1}] Similarity: ${result.similarity.toFixed(3)}`);
    console.log(`ID: ${result.id}`);
    if (result.keywords?.length) {
      console.log(`Keywords: ${result.keywords.join(', ')}`);
    }
    console.log(`Content: ${result.content}`);
    console.log(`Created: ${new Date(result.created_at).toLocaleString()}`);
    console.log('---');
  });
}

async function showStats(memoryService) {
  console.log('Fetching statistics...\n');
  const stats = await memoryService.getStats();

  console.log(`Total Memories: ${stats.totalMemories}`);
  console.log(`\nRecent Memories (${stats.recentMemories.length}):`);
  
  stats.recentMemories.forEach((memory, index) => {
    console.log(`\n[${index + 1}] ${memory.content.substring(0, 100)}...`);
    console.log(`    Created: ${new Date(memory.created_at).toLocaleString()}`);
  });
}

async function listRecent(memoryService) {
  const limit = parseInt(process.argv[3]) || 10;
  console.log(`Fetching ${limit} most recent memories...\n`);
  
  const stats = await memoryService.getStats();
  const memories = stats.recentMemories.slice(0, limit);

  memories.forEach((memory, index) => {
    console.log(`\n[${index + 1}] ID: ${memory.id}`);
    if (memory.keywords?.length) {
      console.log(`Keywords: ${memory.keywords.join(', ')}`);
    }
    console.log(`Content: ${memory.content}`);
    console.log(`Created: ${new Date(memory.created_at).toLocaleString()}`);
    console.log('---');
  });
}

async function interactiveMode(memoryService) {
  console.log('Second Brain Interactive Mode');
  console.log('Commands: add, search, stats, list, exit\n');

  while (true) {
    const command = await question('> ');
    const [cmd, ...args] = command.trim().split(' ');

    try {
      switch (cmd) {
        case 'add':
          const content = args.join(' ') || await question('Content: ');
          const id = await memoryService.addMemory({
            content,
            auto_extract_keywords: true,
          });
          console.log(`✓ Added with ID: ${id}\n`);
          break;

        case 'search':
          const query = args.join(' ') || await question('Query: ');
          const results = await memoryService.searchMemories({
            query,
            limit: 3,
            threshold: 0.7,
          });
          
          if (results.length === 0) {
            console.log('No results found.\n');
          } else {
            results.forEach((r, i) => {
              console.log(`\n[${i + 1}] ${r.similarity.toFixed(3)} - ${r.content.substring(0, 80)}...`);
            });
            console.log();
          }
          break;

        case 'stats':
          const stats = await memoryService.getStats();
          console.log(`Total: ${stats.totalMemories} memories\n`);
          break;

        case 'list':
          const limit = parseInt(args[0]) || 5;
          const recent = await memoryService.getStats();
          recent.recentMemories.slice(0, limit).forEach((m, i) => {
            console.log(`[${i + 1}] ${m.content.substring(0, 60)}...`);
          });
          console.log();
          break;

        case 'exit':
        case 'quit':
          console.log('Goodbye!');
          return;

        case 'help':
          console.log('Commands: add, search, stats, list [n], exit\n');
          break;

        default:
          console.log('Unknown command. Type "help" for available commands.\n');
      }
    } catch (error) {
      console.error('Error:', error.message, '\n');
    }
  }
}

function showHelp() {
  console.log(`
Second Brain MCP CLI

Usage:
  node cli.js <command> [options]

Commands:
  add [content]           Add a new memory
  search [query]          Search memories
  stats                   Show statistics
  list [limit]            List recent memories
  interactive             Start interactive mode
  help                    Show this help message

Examples:
  node cli.js add "Vector databases are fast"
  node cli.js search "database"
  node cli.js stats
  node cli.js list 10
  node cli.js interactive
  `);
}

main().catch(console.error);
