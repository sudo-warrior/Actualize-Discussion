# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build) - force to skip platform checks
RUN npm install --legacy-peer-deps --force

# Copy source code
COPY . .

# Build application with environment variables
# These VITE_ variables are baked into the client bundle at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Avoid using ENV for these to prevent security warnings (SecretsUsedInArgOrEnv)
# instead pass them directly to the build command
RUN VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    NODE_ENV=production \
    npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies - force to skip platform checks
RUN npm install --production --legacy-peer-deps --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# IMPORTANT: Copy public files to where the server expects them
# The server looks for ../public relative to dist/index.cjs
# So we need files at /app/public (not /app/dist/public)
RUN cp -r /app/dist/public /app/public

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the app
CMD ["npm", "start"]
