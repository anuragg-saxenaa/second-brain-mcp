# Deployment Guide

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Select region closest to you
5. Set a strong database password
6. Wait for project to be provisioned (~2 minutes)

### 2. Get API Credentials

1. Go to Project Settings → API
2. Copy the following:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key
   - `service_role` secret key (⚠️ Keep this secure!)

### 3. Run Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor
5. Click "Run" or press Cmd/Ctrl + Enter
6. Verify success (should see "Success. No rows returned")

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Verify Database Setup

Run this query in SQL Editor to verify:

```sql
-- Check if table exists
SELECT * FROM knowledge_vault LIMIT 1;

-- Check if vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'match_documents';
```

## OpenAI Setup

### 1. Get API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Click "Create new secret key"
5. Copy the key (you won't see it again!)
6. Set usage limits to avoid unexpected charges

### 2. Set Usage Limits (Recommended)

1. Go to Settings → Billing → Usage limits
2. Set hard limit: $5/month (or your preference)
3. Set soft limit: $3/month with email notification

## Local Development Setup

### 1. Install Dependencies

```bash
cd second-brain-mcp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Build and Test

```bash
# Build TypeScript
npm run build

# Seed sample data (optional)
npm run db:seed

# Test with CLI
node scripts/cli.js stats
node scripts/cli.js add "Test memory"
node scripts/cli.js search "test"
```

## Claude Desktop Integration

### 1. Locate Config File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### 2. Add MCP Server Configuration

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "node",
      "args": ["/absolute/path/to/second-brain-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "OPENAI_API_KEY": "sk-your-openai-key",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

⚠️ **Important:** Use absolute paths, not relative paths!

### 3. Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Look for MCP server indicator in the UI
4. Test with: "Search my second brain for database information"

## Slack Integration (Optional)

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name: "Second Brain Capture"
4. Choose your workspace

### 2. Configure Event Subscriptions

1. Go to "Event Subscriptions"
2. Enable Events
3. Request URL: Your Supabase Edge Function URL
   - Format: `https://your-project.supabase.co/functions/v1/slack-intake`
4. Subscribe to bot events:
   - `message.channels`
   - `message.groups`
   - `message.im`
5. Save changes

### 3. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy slack-intake --no-verify-jwt

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-your-key
```

### 4. Install App to Workspace

1. Go to "OAuth & Permissions"
2. Add Bot Token Scopes:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `chat:write`
3. Click "Install to Workspace"
4. Authorize the app

### 5. Test Integration

1. Invite bot to a channel: `/invite @Second Brain Capture`
2. Send a message in the channel
3. Check Supabase database to verify memory was saved

## Production Deployment

### Option 1: Docker Container

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t second-brain-mcp .
docker run -d \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  second-brain-mcp
```

### Option 2: PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start dist/index.js --name second-brain-mcp

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### Option 3: Systemd Service (Linux)

Create `/etc/systemd/system/second-brain-mcp.service`:

```ini
[Unit]
Description=Second Brain MCP Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/second-brain-mcp
Environment="SUPABASE_URL=your-url"
Environment="SUPABASE_SERVICE_ROLE_KEY=your-key"
Environment="OPENAI_API_KEY=your-key"
ExecStart=/usr/bin/node /path/to/second-brain-mcp/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable second-brain-mcp
sudo systemctl start second-brain-mcp
sudo systemctl status second-brain-mcp
```

## Monitoring and Maintenance

### 1. Check Logs

```bash
# View logs (if using systemd)
sudo journalctl -u second-brain-mcp -f

# View logs (if using PM2)
pm2 logs second-brain-mcp

# View logs (if using Docker)
docker logs -f container-id
```

### 2. Monitor Supabase Usage

1. Go to Supabase Dashboard → Settings → Usage
2. Check:
   - Database size (500MB free tier limit)
   - Bandwidth (2GB free tier limit)
   - API requests

### 3. Monitor OpenAI Usage

1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. Check daily/monthly costs
3. Verify usage is within expected range

### 4. Database Maintenance

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('knowledge_vault'));

-- Count memories
SELECT COUNT(*) FROM knowledge_vault;

-- Vacuum and analyze (optimize)
VACUUM ANALYZE knowledge_vault;
```

## Backup and Recovery

### 1. Backup Database

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or use pg_dump directly
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

### 2. Restore Database

```bash
# Using Supabase CLI
supabase db reset --db-url "postgresql://..."

# Or use psql directly
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

### 3. Export Memories as JSON

```bash
node scripts/cli.js export > memories.json
```

## Troubleshooting

### MCP Server Not Connecting

1. Check Claude Desktop config path is correct
2. Verify absolute paths (not relative)
3. Check environment variables are set
4. Look for errors in Claude Desktop logs
5. Test server manually: `node dist/index.js`

### Database Connection Failed

1. Verify Supabase URL and keys
2. Check network connectivity
3. Verify pgvector extension is enabled
4. Check if migrations ran successfully

### High OpenAI Costs

1. Review usage at platform.openai.com
2. Reduce embedding frequency
3. Use batch operations
4. Consider caching embeddings
5. Set hard usage limits

### Slow Search Performance

1. Check database indexes exist
2. Verify HNSW index is built
3. Reduce match_count parameter
4. Increase similarity threshold
5. Consider upgrading Supabase plan

## Security Checklist

- [ ] Never commit `.env` file to git
- [ ] Use service role key (not anon key) for server
- [ ] Enable Row Level Security in production
- [ ] Rotate API keys quarterly
- [ ] Set OpenAI usage limits
- [ ] Use HTTPS for all API calls
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated
- [ ] Use strong database password
- [ ] Restrict Supabase API access by IP (if possible)

## Next Steps

1. Test the system with sample data
2. Integrate with your preferred LLM tool
3. Set up monitoring and alerts
4. Create backup schedule
5. Document your specific use cases
6. Share feedback and improvements

For issues and questions, refer to the main README.md or open a GitHub issue.
