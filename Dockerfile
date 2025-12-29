# Multi-stage build for NexusCRM Service
# Optimized for small image size and fast builds

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nexus && \
    adduser -S -D -H -u 1001 -G nexus nexus

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nexus:nexus /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nexus:nexus /app/dist ./dist

# Copy package.json for metadata
COPY --chown=nexus:nexus package.json ./

# Switch to non-root user
USER nexus

# Expose ports
# 9125: HTTP/GraphQL server
# 9126: WebSocket server (using same port as HTTP via Socket.IO)
EXPOSE 9125

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9125/health/live', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
