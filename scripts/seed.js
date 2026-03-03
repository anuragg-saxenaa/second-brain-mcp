import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

async function seedDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error('Error: Required environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('Seeding database with sample memories...');

  const sampleMemories = [
    {
      content: 'Vector databases use HNSW (Hierarchical Navigable Small World) algorithm for approximate nearest neighbor search. This is much faster than brute force for high-dimensional data.',
      keywords: ['vector databases', 'HNSW', 'ANN search', 'algorithms'],
      metadata: { category: 'technical', source: 'learning' },
    },
    {
      content: 'PostgreSQL with pgvector extension enables efficient vector similarity search. It supports multiple distance metrics including cosine, L2, and inner product.',
      keywords: ['PostgreSQL', 'pgvector', 'similarity search', 'database'],
      metadata: { category: 'technical', source: 'documentation' },
    },
    {
      content: 'Model Context Protocol (MCP) allows AI assistants to access external data sources and tools. It provides a standardized way to extend LLM capabilities.',
      keywords: ['MCP', 'AI', 'LLM', 'protocol'],
      metadata: { category: 'technical', source: 'research' },
    },
    {
      content: 'Embeddings are dense vector representations of text that capture semantic meaning. Similar concepts have similar embeddings in vector space.',
      keywords: ['embeddings', 'vectors', 'semantic', 'NLP'],
      metadata: { category: 'technical', source: 'learning' },
    },
    {
      content: 'Supabase provides a free tier with 500MB database storage and 2GB bandwidth, perfect for personal projects and prototypes.',
      keywords: ['Supabase', 'free tier', 'hosting', 'database'],
      metadata: { category: 'tools', source: 'documentation' },
    },
  ];

  for (const memory of sampleMemories) {
    try {
      console.log(`Processing: ${memory.content.substring(0, 50)}...`);

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: memory.content,
        dimensions: 1536,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Insert into database
      const { data, error } = await supabase
        .from('knowledge_vault')
        .insert({
          content: memory.content,
          embedding,
          keywords: memory.keywords,
          metadata: memory.metadata,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting memory:', error);
        continue;
      }

      console.log(`✓ Added memory with ID: ${data.id}`);
    } catch (error) {
      console.error('Error processing memory:', error);
    }
  }

  console.log('\nSeeding completed!');
  
  // Verify
  const { count } = await supabase
    .from('knowledge_vault')
    .select('*', { count: 'exact', head: true });

  console.log(`Total memories in database: ${count}`);
}

seedDatabase().catch(console.error);
