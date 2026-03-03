# Second Brain MCP Server

A production-grade Model Context Protocol (MCP) server that provides persistent, searchable, AI-accessible memory for LLMs. Built with TypeScript, Supabase, and OpenAI embeddings.

## Features

- **Vector Similarity Search**: Semantic search using OpenAI embeddings and pgvector
- **Automatic Keyword Extraction**: AI-powered keyword extraction for hybrid search
- **MCP Protocol**: Standard interface for LLM integration (Claude, ChatGPT, etc.)
- **Production-Ready**: Comprehensive error handling, logging, and validation
- **Cost-Effective**: ~$0.30/month using Supabase free tier
- **Type-Safe**: Full TypeScript implementation with Zod validation
- **Scalable**: Batch operations and optimized database queries

## Architecture

```
┌─────────────┐
│   LLM Tool  │ (Claude Desktop, ChatGPT, etc.)
└──────┬──────┘
       │ MCP Protocol (stdin/stdout)
       │
┌──────▼──────────────────────────────┐
│     Second Brain MCP Server         │
│  ┌────────────────────────────────┐ │
│  │  Memory Service                │ │
│  │  - Add/Search/Update/Delete    │ │
│  │  - Context Generation          │ │
│  └────────┬───────────────────────┘ │
│           │                          │
│  ┌────────▼──────────┐ ┌──────────┐ │
│  │ Embedding Service │ │ Database │ │
│  │ (OpenAI API)      │ │ Service  │ │
│  └───────────────────┘ └────┬─────┘ │
└─────────────────────────────┼───────┘
                              │
                    ┌─────────▼─────────┐
                    │   Supabase        │
                    │   PostgreSQL      │
                    │   + pgvector      │
                    └───────────────────┘
```

## Prerequisites

- Node.js 18+
- Supabase account (free tier)
- OpenAI API key

## Installation

1. Clone and install dependencies:

```bash
cd second-brain-mcp
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

3. Run database migrations:

First, manually run the SQL migration in your Supabase SQL editor:
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
- Execute the migration

4. (Optional) Seed with sample data:

```bash
npm run db:seed
```

5. Build the project:

```bash
npm run build
```

## Usage

### CLI Tool

The CLI provides an easy way to interact with your Second Brain:

```bash
# Add a memory
node scripts/cli.js add "Vector databases use HNSW algorithm"

# Search memories
node scripts/cli.js search "database algorithms"

# Show statistics
node scripts/cli.js stats

# List recent memories
node scripts/cli.js list 10

# Interactive mode
node scripts/cli.js interactive
```

### MCP Server

Start the MCP server:

```bash
npm start
```

The server communicates via stdin/stdout using JSON messages:

**Request format:**
```json
{
  "method": "memory.add",
  "params": {
    "content": "Your memory content here",
    "auto_extract_keywords": true
  }
}
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "message": "Memory added successfully"
  }
}
```

### Available MCP Methods

#### `memory.add`
Add a single memory.

```json
{
  "method": "memory.add",
  "params": {
    "content": "Memory content",
    "metadata": { "source": "api" },
    "auto_extract_keywords": true
  }
}
```

#### `memory.addBatch`
Add multiple memories at once.

```json
{
  "method": "memory.addBatch",
  "params": {
    "memories": [
      { "content": "First memory", "auto_extract_keywords": true },
      { "content": "Second memory", "auto_extract_keywords": true }
    ]
  }
}
```

#### `memory.search`
Search memories by semantic similarity.

```json
{
  "method": "memory.search",
  "params": {
    "query": "database algorithms",
    "limit": 5,
    "threshold": 0.7
  }
}
```

#### `memory.getContext`
Get formatted context for LLM injection.

```json
{
  "method": "memory.getContext",
  "params": {
    "query": "What did I learn about databases?",
    "limit": 5
  }
}
```

#### `memory.get`
Retrieve a specific memory by ID.

```json
{
  "method": "memory.get",
  "params": {
    "id": "uuid-here"
  }
}
```

#### `memory.update`
Update an existing memory.

```json
{
  "method": "memory.update",
  "params": {
    "id": "uuid-here",
    "content": "Updated content",
    "keywords": ["new", "keywords"]
  }
}
```

#### `memory.delete`
Delete a memory.

```json
{
  "method": "memory.delete",
  "params": {
    "id": "uuid-here"
  }
}
```

#### `memory.stats`
Get statistics about your memory vault.

```json
{
  "method": "memory.stats",
  "params": {}
}
```

#### `health`
Check server health.

```json
{
  "method": "health",
  "params": {}
}
```

## Integration with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "node",
      "args": ["/absolute/path/to/second-brain-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key",
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

## Development

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Database Schema

The `knowledge_vault` table stores memories with:

- `id`: UUID primary key
- `content`: Text content of the memory
- `embedding`: 1536-dimensional vector for semantic search
- `keywords`: Array of extracted keywords
- `metadata`: JSONB for flexible additional data
- `created_at`: Timestamp
- `updated_at`: Auto-updated timestamp

Indexes:
- HNSW index on embeddings for fast vector search
- GIN indexes on keywords and metadata
- Full-text search index on content

## Cost Breakdown

| Component | Cost |
|-----------|------|
| Supabase Free Tier | $0 (500MB DB, 2GB bandwidth) |
| OpenAI Embeddings | ~$0.10/month (10,000 notes) |
| OpenAI Keywords | ~$0.05/month (GPT-3.5-turbo) |
| Buffer | ~$0.15/month |
| **Total** | **~$0.30/month** |

## Performance

- **Embedding generation**: ~100-200ms per text
- **Vector search**: <50ms for 10,000 memories
- **Batch operations**: 10-50 memories per second
- **Storage**: ~2KB per memory (including embedding)

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use service role key** - Required for RLS bypass
3. **Enable RLS policies** - Configured in migration for multi-user scenarios
4. **Rotate API keys** - Quarterly rotation recommended
5. **Monitor usage** - Set up Supabase and OpenAI usage alerts

## Troubleshooting

### "Failed to generate embedding"
- Check OpenAI API key is valid
- Verify API quota hasn't been exceeded
- Check network connectivity

### "Database connection failed"
- Verify Supabase URL and keys
- Check if pgvector extension is enabled
- Ensure migrations have been run

### "No results found"
- Lower similarity threshold (default 0.7)
- Check if memories exist in database
- Verify embedding dimensions match (1536)

### High costs
- Batch embeddings when possible
- Cache frequently accessed memories
- Use smaller embedding model if acceptable

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [your-repo-url]
- Documentation: [your-docs-url]

## Roadmap

- [ ] Web clipper browser extension
- [ ] Mobile capture interface
- [ ] Knowledge graph visualization
- [ ] Voice note transcription
- [ ] Analytics dashboard
- [ ] Multi-user support
- [ ] Slack/Discord integration
- [ ] Export/import functionality
- [ ] Automatic memory consolidation
- [ ] Custom embedding models

## Acknowledgments

- Supabase for excellent PostgreSQL hosting
- OpenAI for embedding and LLM APIs
- pgvector for vector similarity search
- Model Context Protocol specification
