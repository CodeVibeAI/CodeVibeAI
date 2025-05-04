# CodeVibeAI Dockerfile - Multi-stage build

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git python3 make g++ bash

# Create app directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json lerna.json ./
COPY extensions ./extensions/

# Install dependencies
RUN npm ci

# Copy the rest of the project files
COPY . .

# Build the application in production mode
RUN npm run build:prod

# Create production image
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache git

# Create app directory
WORKDIR /app

# Copy only the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/plugins ./plugins

# Install only production dependencies
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/browser/main.js", "--hostname=0.0.0.0"]