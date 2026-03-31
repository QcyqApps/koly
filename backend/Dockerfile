FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
RUN npm ci

# Copy source code
COPY src ./src
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Verify build output
RUN echo "=== Build output ===" && ls -la dist/src/ && ls -la dist/src/main.js

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm install dotenv typescript ts-node @types/node prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Create uploads directory
RUN mkdir -p uploads

# Verify files exist
RUN echo "=== Production files ===" && ls -la dist/src/

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy && node dist/src/main.js"
