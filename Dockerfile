FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Expose port
EXPOSE 5000

# Run the app
CMD ["npm", "start"]
