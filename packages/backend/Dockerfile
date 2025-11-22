# Multi-stage Dockerfile for NestJS Backend
# Optimized for production with native dependencies (sharp, onnxruntime-node, bcrypt)

# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Install system dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

# Stage 2: Dependencies installation
FROM base AS dependencies

# Copy root package files for workspace setup
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared package (dependency of backend)
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# Copy backend package files
COPY packages/backend/package*.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/nest-cli.json ./packages/backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspaces --if-present

# Stage 3: Build
FROM dependencies AS build

# Copy backend source code
COPY packages/backend/src ./packages/backend/src

# Build shared package first (TypeScript project reference)
WORKDIR /app/packages/shared
RUN npm run build

# Build backend
WORKDIR /app/packages/backend
RUN npm run build

# Stage 4: Production dependencies
FROM base AS production-deps

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared package
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy backend package files
COPY packages/backend/package*.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/

# Install only production dependencies
RUN npm ci --workspaces --if-present --omit=dev

# Stage 5: Final production image
FROM node:20-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy production dependencies (npm workspaces hoists to root node_modules)
COPY --from=production-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built shared package
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/

# Copy built backend
COPY --from=build --chown=nestjs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/backend/package.json ./packages/backend/

# Copy root package.json for workspace resolution
COPY --chown=nestjs:nodejs package.json ./

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/original /app/uploads/medium /app/uploads/thumbnail && \
    chown -R nestjs:nodejs /app/uploads

# Create models directory for ML models
RUN mkdir -p /app/models && \
    chown -R nestjs:nodejs /app/models

# Switch to non-root user
USER nestjs

# Set working directory to backend
WORKDIR /app/packages/backend

# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application with PM2
CMD ["npm", "run", "start:prod"]

