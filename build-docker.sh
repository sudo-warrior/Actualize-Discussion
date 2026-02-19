#!/bin/bash
# Build Docker image with Supabase credentials

# Load environment variables (handling non-exported ones)
export $(grep -v '^#' .env | xargs)

# Build with build args
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t incident-commander:latest \
  .

echo "Build complete! Deploy with:"
echo "docker run -d --name incident-commander -p 5000:5000 --env-file .env incident-commander:latest"
