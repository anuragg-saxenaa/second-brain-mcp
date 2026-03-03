#!/bin/bash

# Second Brain MCP Setup Script
# This script automates the setup process

set -e

echo "🧠 Second Brain MCP Setup Script"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your credentials before proceeding${NC}"
    echo ""
    echo "Required credentials:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - OPENAI_API_KEY"
    echo ""
    read -p "Have you configured .env? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Please configure .env and run this script again${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate environment variables
echo "Validating environment variables..."
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment variables validated${NC}"
echo ""

# Build project
echo "Building project..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Ask about seeding
read -p "Would you like to seed sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    npm run db:seed
    echo -e "${GREEN}✓ Sample data seeded${NC}"
fi
echo ""

# Test CLI
echo "Testing CLI..."
node scripts/cli.js stats
echo -e "${GREEN}✓ CLI working${NC}"
echo ""

# Create logs directory
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Summary
echo "=================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify database migration ran in Supabase SQL Editor"
echo "  2. Test the CLI: node scripts/cli.js interactive"
echo "  3. Configure Claude Desktop (see README.md)"
echo "  4. Start using your Second Brain!"
echo ""
echo "Quick test:"
echo "  node scripts/cli.js add \"This is my first memory\""
echo "  node scripts/cli.js search \"first\""
echo ""
echo "Documentation:"
echo "  - README.md - Full documentation"
echo "  - QUICKSTART.md - 10-minute setup guide"
echo "  - DEPLOYMENT.md - Production deployment"
echo "  - ARCHITECTURE.md - System architecture"
echo ""
echo "Happy memory building! 🧠✨"
