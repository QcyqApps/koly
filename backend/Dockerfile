FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies + tools for prisma config
COPY package*.json ./
RUN npm ci --only=production && \
    npm install dotenv typescript ts-node @types/node

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

# Run migrations and start app
CMD sh -c "npx prisma migrate deploy && node dist/main.js"
