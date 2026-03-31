FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Final stage - copy built files to volume on startup
FROM alpine:latest

COPY --from=builder /app/dist /dist

# Copy files to mounted volume and keep container running briefly
CMD sh -c "cp -r /dist/* /output/ && echo 'Frontend files copied to volume'"
