# Use Node.js LTS version
FROM node:20-slim AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy app source
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-slim

WORKDIR /app

# Install PM2 globally
RUN npm install pm2 -g

# Copy built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/ecosystem.config.js ./

# Expose port
EXPOSE 3000

# Start the application using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]