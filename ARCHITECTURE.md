# Architecture Documentation

## System Overview

The Second Brain MCP system is a production-grade knowledge management platform that provides persistent, searchable memory for LLMs through the Model Context Protocol.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interactions                        │
├─────────────┬─────────────────┬──────────────┬─────────────────┤
│ Claude      │ ChatGPT         │ CLI Tool     │ Slack Messages  │
│ Desktop     │ Plugin          │              │                 │
└──────┬──────┴────────┬────────┴──────┬───────┴────────┬────────┘
       │                │               │                │
       │ MCP Protocol   │ MCP Protocol  │ Direct API     │ Webhook
       │ (stdin/stdout) │               │                │
       │                │               │                │
┌──────▼────────────────▼───────────────▼────────────────▼────────┐
│                    Second Brain MCP Server                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     MCP Service Layer                      │ │
│  │  - Request routing and validation                          │ │
│  │  - Protocol compliance                                     │ │
│  │  - Error handling and logging                              │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │                    Memory Service Layer                    │ │
│  │  - Business logic orchestration                            │ │
│  │  - Memory CRUD operations                                  │ │
│  │  - Context generation for LLMs                             │ │
│  │  - Batch processing                                        │ │
│  └───────┬──────────────────────────┬─────────────────────────┘ │
│          │                          │                            │
│  ┌───────▼─────────────┐   ┌───────▼──────────────┐            │
│  │ Embedding Service   │   │  Database Service    │            │
│  │                     │   │                      │            │
│  │ - Text→Vector       │   │ - CRUD operations    │            │
│  │ - Batch embeddings  │   │ - Vector search      │            │
│  │ - Keyword extract   │   │ - Connection pool    │            │
│  │ - OpenAI API        │   │ - Query optimization │            │
│  └──────┬──────────────┘   └──────┬───────────────┘            │
└─────────┼─────────────────────────┼────────────────────────────┘
          │                         │
   ┌──────▼──────┐         ┌────────▼─────────────┐
   │  OpenAI API │         │   Supabase Cloud     │
   │             │         │                      │
   │ - Embeddings│         │  PostgreSQL + RLS    │
   │ - GPT-3.5   │         │  pgvector extension  │
   │ - Rate limit│         │  HNSW indexing       │
   └─────────────┘         │  Edge Functions      │
                           │  Real-time subscript │
                           └──────────────────────┘
```

## Component Details

### 1. MCP Service Layer
**Responsibility:** Protocol implementation and request handling

**Key Features:**
- JSON-RPC style message handling via stdin/stdout
- Request validation using Zod schemas
- Centralized error handling
- Logging and monitoring

**Methods:**
- `memory.add` - Add single memory
- `memory.addBatch` - Batch memory addition
- `memory.search` - Semantic search
- `memory.get` - Retrieve by ID
- `memory.update` - Update memory
- `memory.delete` - Delete memory
- `memory.stats` - Get statistics
- `memory.getContext` - LLM context injection
- `health` - Health check

### 2. Memory Service Layer
**Responsibility:** Business logic and orchestration

**Workflows:**

#### Add Memory Flow
```
Input → Validate → Generate Embedding → Extract Keywords → Store → Return ID
```

#### Search Flow
```
Query → Generate Query Embedding → Vector Search → Rank Results → Return
```

#### Update Flow
```
ID + Updates → Fetch Current → Regenerate Embedding (if content changed) → 
Update DB → Return Success
```

**Features:**
- Automatic embedding generation
- Keyword extraction with LLM
- Batch processing optimization
- Context formatting for LLMs

### 3. Embedding Service
**Responsibility:** AI model interactions

**Operations:**
- Text → 1536-dimensional vector (OpenAI text-embedding-3-small)
- Batch embedding generation (up to 2048 texts)
- Keyword extraction (GPT-3.5-turbo)
- Error handling and retry logic
- Cost optimization through batching

**Performance:**
- ~100-200ms per embedding
- Batch: 10-50 embeddings/second
- Cost: ~$0.02 per 1M tokens

### 4. Database Service
**Responsibility:** Data persistence and retrieval

**Schema:**
```sql
knowledge_vault (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  keywords TEXT[],
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Indexes:**
- HNSW index on embedding (vector_cosine_ops)
- GIN index on keywords
- GIN index on metadata
- B-tree index on created_at

**Functions:**
- `match_documents()` - Vector similarity search
- `hybrid_search()` - Combined vector + keyword search
- Auto-update trigger for updated_at

## Data Flow

### Memory Addition
```
1. User Input
   ↓
2. Validation (Zod schema)
   ↓
3. Generate Embedding (OpenAI API)
   ↓
4. Extract Keywords (GPT-3.5)
   ↓
5. Create Memory Object
   ↓
6. Insert to Database (Supabase)
   ↓
7. Return UUID
```

### Memory Search
```
1. Search Query
   ↓
2. Generate Query Embedding
   ↓
3. Vector Similarity Search (pgvector)
   ↓
4. Filter by Threshold (default 0.7)
   ↓
5. Rank by Cosine Similarity
   ↓
6. Return Top N Results
```

### Context Injection
```
1. LLM Query
   ↓
2. Search Relevant Memories
   ↓
3. Format Results with Metadata
   ↓
4. Inject into LLM Context
   ↓
5. LLM Response (with context)
```

## Technology Stack

### Backend
- **Runtime:** Node.js 18+ (ESM modules)
- **Language:** TypeScript 5.3+ (strict mode)
- **Framework:** Custom MCP implementation
- **Validation:** Zod 3.22+
- **Logging:** Winston 3.11+

### Database
- **Platform:** Supabase (PostgreSQL 15+)
- **Vector Search:** pgvector extension
- **Indexing:** HNSW algorithm
- **RLS:** Row Level Security enabled

### AI Services
- **Embeddings:** OpenAI text-embedding-3-small
- **Keywords:** OpenAI GPT-3.5-turbo
- **Dimensions:** 1536

### Development
- **Build:** TypeScript compiler
- **Testing:** Vitest
- **Linting:** ESLint + TypeScript ESLint
- **Formatting:** Prettier

## Security Architecture

### Authentication
- Supabase service role key (server-side only)
- OpenAI API key (encrypted at rest)
- Environment variable validation

### Data Protection
- Row Level Security policies
- Service role bypass for server operations
- HTTPS-only API communication
- Input sanitization via Zod

### Rate Limiting
- Configurable request limits
- Time window based throttling
- Per-client tracking (future)

## Scalability Considerations

### Current Capacity (Free Tier)
- **Database:** 500MB (~250,000 memories)
- **Bandwidth:** 2GB/month
- **Concurrent connections:** 60

### Performance Metrics
- Vector search: <50ms (10K memories)
- Embedding generation: ~150ms
- Batch operations: 10-50/second
- Storage per memory: ~2KB

### Optimization Strategies
1. **Batch Processing:** Group embedding requests
2. **Connection Pooling:** Reuse database connections
3. **Caching:** Cache frequent queries (future)
4. **Indexing:** Optimize HNSW parameters
5. **Compression:** JSONB for metadata

## Monitoring and Observability

### Logging Levels
- **Error:** Critical failures, exceptions
- **Warn:** Degraded performance, retries
- **Info:** Successful operations, stats
- **Debug:** Detailed execution flow

### Metrics to Track
- Memory count and growth rate
- Search latency (p50, p95, p99)
- Embedding API costs
- Database size and query performance
- Error rates by type

### Health Checks
- Database connectivity
- OpenAI API availability
- Disk space usage
- Memory consumption

## Deployment Architecture

### Development
```
Local Machine
├── TypeScript watch mode
├── Local .env file
├── Direct Supabase connection
└── Console logging
```

### Production Options

#### Option 1: Systemd Service
```
Linux Server
├── Systemd unit file
├── Environment variables in service config
├── Log rotation
└── Auto-restart on failure
```

#### Option 2: Docker Container
```
Docker Host
├── Dockerfile build
├── Environment variables in compose
├── Volume mounts for logs
└── Health checks
```

#### Option 3: PM2 Process Manager
```
Node.js Server
├── PM2 daemon
├── Cluster mode (optional)
├── Log management
└── Auto-restart
```

## Integration Patterns

### Claude Desktop (Primary)
- **Protocol:** MCP via stdin/stdout
- **Transport:** Node.js child process
- **Config:** claude_desktop_config.json
- **Authentication:** Environment variables

### ChatGPT Plugin (Future)
- **Protocol:** REST API wrapper
- **Transport:** HTTPS
- **Config:** Plugin manifest
- **Authentication:** OAuth 2.0

### Slack Integration
- **Protocol:** Webhooks + Edge Functions
- **Transport:** HTTPS POST
- **Config:** Slack App manifest
- **Authentication:** Signing secret

## Error Handling Strategy

### Error Types
1. **Validation Errors** (400) - Bad input
2. **Not Found Errors** (404) - Missing resources
3. **Database Errors** (500) - DB failures
4. **Embedding Errors** (500) - API failures
5. **Rate Limit Errors** (429) - Too many requests

### Recovery Strategies
- Automatic retry with exponential backoff
- Graceful degradation (skip keywords if API fails)
- Circuit breaker for external APIs
- Transaction rollback on DB errors
- Detailed error logging with context

## Testing Strategy

### Unit Tests
- Service layer methods
- Utility functions
- Schema validation
- Error handling

### Integration Tests
- Database operations
- OpenAI API calls (mocked)
- End-to-end workflows
- Error scenarios

### Performance Tests
- Vector search latency
- Batch operation throughput
- Memory usage under load
- Database query performance

## Future Enhancements

### Short Term
- [ ] Caching layer (Redis)
- [ ] Prometheus metrics
- [ ] GraphQL API option
- [ ] Memory versioning

### Medium Term
- [ ] Multi-user support
- [ ] Knowledge graph visualization
- [ ] Advanced analytics
- [ ] Mobile apps

### Long Term
- [ ] Federated search
- [ ] AI-powered summarization
- [ ] Custom embedding models
- [ ] Distributed deployment

## Cost Analysis

### Monthly Costs (Typical Usage: 100 memories/month)

| Component | Usage | Cost |
|-----------|-------|------|
| Supabase Database | 500MB storage | $0.00 (free tier) |
| Supabase Bandwidth | <2GB transfer | $0.00 (free tier) |
| OpenAI Embeddings | ~10K tokens | $0.10 |
| OpenAI Keywords | ~5K tokens | $0.05 |
| **Total** | | **$0.15/month** |

### Scaling Costs (1000 memories/month)

| Component | Usage | Cost |
|-----------|-------|------|
| Supabase Database | Still <500MB | $0.00 |
| Supabase Bandwidth | <2GB | $0.00 |
| OpenAI Embeddings | ~100K tokens | $1.00 |
| OpenAI Keywords | ~50K tokens | $0.50 |
| **Total** | | **$1.50/month** |

---

## References

- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [Supabase Documentation](https://supabase.com/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
