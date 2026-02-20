# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build) - force to skip platform checks
RUN npm install --legacy-peer-deps --force

# Copy source code
COPY . .

# Build application
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies - force to skip platform checks
RUN npm install --production --legacy-peer-deps --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create symlink for static files (server expects /app/public)
RUN ln -s /app/dist/public /app/public

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the app
CMD ["npm", "start"]
