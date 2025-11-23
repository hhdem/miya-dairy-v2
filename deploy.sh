#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin 001-photo-gallery-cms

# Step 2: Build shared package
echo -e "${YELLOW}🔨 Building shared package...${NC}"
npm run build --workspace=@miya-dairy/shared

# Step 3: Build frontend packages
echo -e "${YELLOW}🎨 Building frontend packages...${NC}"
npm run build --workspace=@miya-dairy/frontend-admin
npm run build --workspace=@miya-dairy/frontend-public

# Step 4: Rebuild and restart backend (with ML models)
echo -e "${YELLOW}🐳 Rebuilding backend Docker image...${NC}"
docker compose build backend

echo -e "${YELLOW}🔄 Restarting backend...${NC}"
docker compose up -d backend

# Step 5: Restart Caddy
echo -e "${YELLOW}🔄 Restarting Caddy...${NC}"
docker compose restart caddy

# Step 6: Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
docker compose ps

# Step 7: Check backend logs for ML model loading
echo -e "${YELLOW}📝 Checking backend logs (last 20 lines)...${NC}"
docker compose logs backend --tail=20

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services:"
echo "  - Frontend Public: https://miya.im/"
echo "  - Frontend Admin:  https://miya.im/admin/"
echo "  - Backend API:     https://miya.im/api/"
echo ""
echo "To view logs:"
echo "  docker compose logs -f backend"

