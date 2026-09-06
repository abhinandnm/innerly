# Multi-stage build for Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (works with or without package-lock.json)
RUN npm install

# Copy source code
COPY . .

# Run production build (Vite + esbuild bundle for server.cjs)
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency definitions and install production-only dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled frontend and backend assets from builder stage
COPY --from=builder /app/dist ./dist

# Document port binding
EXPOSE 3000

# Start compiled CommonJS server
CMD ["node", "dist/server.cjs"]
