# Quick Start Guide

Get your Second Brain MCP server running in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier)
- An OpenAI API key

## Step 1: Supabase Setup (3 minutes)

1. **Create project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Fill in details and wait for provisioning

2. **Get credentials**
   - Go to Settings → API
   - Copy Project URL and service_role key

3. **Run migration**
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run

## Step 2: OpenAI Setup (2 minutes)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Set usage limit to $5/month (recommended)

## Step 3: Install and Configure (3 minutes)

```bash
# Clone or download the project
cd second-brain-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

## Step 4: Build and Test (2 minutes)

```bash
# Build
npm run build

# Seed sample data (optional)
npm run db:seed

# Test with CLI
node scripts/cli.js stats
node scripts/cli.js add "My first memory"
node scripts/cli.js search "memory"
```

## Step 5: Integrate with Claude Desktop

**macOS:**
```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

Add this configuration (use absolute paths):
```json
{
  "mcpServers": {
    "second-brain": {
      "command": "node",
      "args": ["/absolute/path/to/second-brain-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

Restart Claude Desktop and test:
```
"Search my second brain for memories about databases"
```

## Common Issues

### "Module not found"
```bash
npm run build
```

### "Database connection failed"
- Check Supabase URL and keys
- Verify migration ran successfully

### "OpenAI API error"
- Check API key is valid
- Verify you have credits

### Claude Desktop not connecting
- Use absolute paths (not relative)
- Check environment variables
- Restart Claude Desktop

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Try the interactive CLI: `node scripts/cli.js interactive`
- Add more memories and test search quality

## Usage Examples

```bash
# Add a memory
node scripts/cli.js add "Vector databases use HNSW for fast search"

# Search semantically
node scripts/cli.js search "fast database algorithms"

# Interactive mode
node scripts/cli.js interactive
> add PostgreSQL supports vector similarity search
> search vector
> stats
> exit
```

## Cost Estimate

With typical usage (100 memories/month):
- Supabase: $0 (free tier)
- OpenAI embeddings: ~$0.10
- OpenAI keywords: ~$0.05
- **Total: ~$0.15/month**

## Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Docs: [Full Documentation](README.md)
- Deployment: [Deployment Guide](DEPLOYMENT.md)

---

You're all set! Start building your Second Brain. 🧠✨
