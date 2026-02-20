# Debug Checklist for Static File Issue

## 🔍 Problem
Assets still serving as `text/html` after multiple rebuilds.

## 📋 Things to Check

### 1. Check Docker Container Logs
```bash
docker logs <container-id> 2>&1 | grep static

# Look for:
# [static] __dirname: /app/dist
# [static] Looking for static files at: /app/public
# [static] Exists: true
# [static] Assets path: /app/public/assets
# [static] Assets exists: true
# [static] Assets files: index-CUdQjczV.css, index-DrNCLeQh.js
```

### 2. Check if Files Exist in Container
```bash
# Check symlink
docker exec -it <container-id> ls -la /app/ | grep public

# Check actual files
docker exec -it <container-id> ls -la /app/dist/public/assets/

# Check symlink target
docker exec -it <container-id> ls -la /app/public/assets/
```

### 3. Check Nginx Configuration
If you're using nginx as a reverse proxy, it might be caching or interfering:

```bash
# Check nginx config
cat /etc/nginx/sites-available/rootcause.greywolfx.io

# Look for:
# - location /assets/ blocks
# - proxy_pass settings
# - caching headers
```

### 4. Test Direct Container Access
```bash
# If container is on port 5000
curl -I http://localhost:5000/assets/index-DrNCLeQh.js

# Should show: Content-Type: application/javascript
```

### 5. Check if Nginx is Caching
```bash
# Clear nginx cache
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx

# Or restart nginx
sudo systemctl restart nginx
```

## 🔧 Possible Issues

### Issue 1: Nginx Reverse Proxy
If nginx is in front of the app, it might have:
- Cached responses
- Wrong proxy_pass configuration
- Missing proxy headers

**Fix:**
```nginx
location /assets/ {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
    
    # Don't cache assets during debugging
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Issue 2: Symlink Not Working
The Docker symlink might not be created properly.

**Check:**
```bash
docker exec -it <container-id> readlink /app/public
# Should show: /app/dist/public
```

**Fix in Dockerfile:**
```dockerfile
# Instead of symlink, copy files
COPY --from=builder /app/dist/public ./public
```

### Issue 3: Build Not Including Assets
The build might not be creating the assets.

**Check:**
```bash
docker exec -it <container-id> find /app -name "*.js" -o -name "*.css" | grep assets
```

### Issue 4: Wrong __dirname in Bundled Code
The bundled code might have wrong path resolution.

**Check server logs for:**
```
[static] __dirname: /app/dist
[static] Looking for static files at: /app/public
```

## 🚀 Quick Fix: Alternative Dockerfile

If symlink doesn't work, try this Dockerfile:

```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --force
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --force
COPY --from=builder /app/dist ./dist

# Copy public files to expected location (no symlink)
RUN mkdir -p /app/public && cp -r /app/dist/public/* /app/public/

EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 Commands to Run

```bash
# 1. Rebuild with no cache
docker build --no-cache -t incident-commander:latest .

# 2. Stop and remove old container
docker stop <container-id>
docker rm <container-id>

# 3. Start new container
docker run -d -p 5000:5000 --env-file .env --name incident-commander incident-commander:latest

# 4. Check logs
docker logs -f incident-commander

# 5. Test
curl -I http://localhost:5000/assets/index-DrNCLeQh.js
```

## 🆘 If Still Not Working

Share these outputs:
1. `docker logs <container-id> 2>&1 | grep static`
2. `docker exec -it <container-id> ls -la /app/`
3. `docker exec -it <container-id> ls -la /app/public/assets/`
4. `docker exec -it <container-id> cat /app/dist/index.cjs | grep "static"`
5. Nginx config (if using nginx)
6. `curl -I http://localhost:5000/assets/index-DrNCLeQh.js` (direct to container)
7. `curl -I https://rootcause.greywolfx.io/assets/index-DrNCLeQh.js` (through nginx)

---

**Latest commit:** `0000861`  
**Status:** Waiting for logs to diagnose
