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

# Install production dependencies + prisma CLI
COPY package*.json ./
RUN npm ci --only=production && npm install -g prisma

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

# Run migrations and start app
CMD sh -c "prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"
