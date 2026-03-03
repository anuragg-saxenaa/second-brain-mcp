import { z } from 'zod';

// Memory entry schema
export const memorySchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  embedding: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Memory = z.infer<typeof memorySchema>;

// Search query schema
export const searchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
  filters: z.record(z.any()).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Search result schema
export const searchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  similarity: z.number(),
  created_at: z.string().datetime(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

// Add memory request schema
export const addMemoryRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  metadata: z.record(z.any()).optional(),
  auto_extract_keywords: z.boolean().default(true),
});

export type AddMemoryRequest = z.infer<typeof addMemoryRequestSchema>;

// Batch add memories schema
export const batchAddMemoriesSchema = z.object({
  memories: z.array(addMemoryRequestSchema).min(1).max(100),
});

export type BatchAddMemories = z.infer<typeof batchAddMemoriesSchema>;

// Delete memory schema
export const deleteMemorySchema = z.object({
  id: z.string().uuid(),
});

export type DeleteMemory = z.infer<typeof deleteMemorySchema>;

// Update memory schema
export const updateMemorySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(10000).optional(),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateMemory = z.infer<typeof updateMemorySchema>;
