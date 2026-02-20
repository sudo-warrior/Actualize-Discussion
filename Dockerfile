FROM node:20-slim

WORKDIR /app

# Install dependencies - use --ignore-scripts to avoid platform issues
COPY package*.json ./
RUN npm install --ignore-scripts --legacy-peer-deps || npm install --force --legacy-peer-deps

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Expose port
EXPOSE 5000

# Run the app
CMD ["npm", "start"]
