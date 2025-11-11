# Multi-stage build for ClovaLink
FROM node:20-bullseye AS builder

WORKDIR /app

# Install Rust for building rust-core
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Copy rust-core directory
COPY rust-core ./rust-core/

# Install dependencies and build Rust library
RUN npm ci
RUN cd rust-core && npm install && npm run build

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Production image
FROM node:20-bullseye-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/copy-pdf-worker.js ./
COPY --from=builder /app/rust-core ./rust-core
COPY --from=builder /app/src ./src

# Create uploads directory
RUN mkdir -p uploads

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]

