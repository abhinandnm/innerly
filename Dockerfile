# Multi-stage build for Google Cloud Run using Debian slim for glibc native binary compatibility
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json ./

# Install all dependencies cleanly
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Run production build (Vite + esbuild bundle for server.cjs)
RUN npm run build

# Runner stage
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json
COPY package.json ./

# Copy pre-installed node_modules and compiled dist directly from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Document port binding
EXPOSE 3000

# Start compiled CommonJS server
CMD ["node", "dist/server.cjs"]
