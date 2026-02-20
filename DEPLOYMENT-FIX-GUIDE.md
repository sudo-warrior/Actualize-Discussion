# Production Deployment Fix Guide

## 🔴 Current Issue

**Error:** Assets still serving as `text/html` instead of correct MIME types
**URL:** https://rootcause.greywolfx.io/

## 🔍 Root Cause

The production server is running **old code**. The fix has been pushed to GitHub but the Docker container needs to be rebuilt and redeployed.

## ✅ Solution: Rebuild & Redeploy

### Step 1: Pull Latest Code
```bash
cd /path/to/Actualize-Discussion
git pull origin main
```

### Step 2: Rebuild Docker Image
```bash
# Build with latest code
docker build -t incident-commander:latest .

# Or if using a registry
docker build -t your-registry/incident-commander:latest .
docker push your-registry/incident-commander:latest
```

### Step 3: Stop Old Container
```bash
# Find running container
docker ps | grep incident-commander

# Stop it
docker stop <container-id>

# Or if using docker-compose
docker-compose down
```

### Step 4: Start New Container
```bash
# Using docker run
docker run -d -p 5000:5000 --env-file .env incident-commander:latest

# Or using docker-compose
docker-compose up -d
```

### Step 5: Verify
```bash
# Check logs for debug output
docker logs <container-id>

# Should see:
# [static] __dirname: /app/dist
# [static] Looking for static files at: /app/public
# [static] Exists: true
# [static] Assets path: /app/public/assets
# [static] Assets exists: true
# [static] Assets files: index-CUdQjczV.css, index-DrNCLeQh.js

# Test MIME types
curl -I https://rootcause.greywolfx.io/assets/index-DrNCLeQh.js
# Should show: Content-Type: application/javascript; charset=utf-8
```

## 🐛 If Still Not Working

### Check 1: Verify Symlink in Container
```bash
docker exec -it <container-id> ls -la /app/
# Should show: public -> /app/dist/public

docker exec -it <container-id> ls -la /app/public/assets/
# Should list: index-CUdQjczV.css, index-DrNCLeQh.js
```

### Check 2: Verify Build Output
```bash
docker exec -it <container-id> ls -la /app/dist/public/assets/
# Should list the actual files
```

### Check 3: Check Server Logs
```bash
docker logs <container-id> 2>&1 | grep static
# Look for the debug output
```

## 🔧 Alternative: Manual Fix (If Symlink Fails)

If the symlink approach doesn't work, update the Dockerfile:

```dockerfile
# Instead of symlink, copy files directly
COPY --from=builder /app/dist/public ./public
```

Then rebuild and redeploy.

## 📋 Deployment Checklist

- [ ] Pull latest code from GitHub
- [ ] Rebuild Docker image
- [ ] Stop old container
- [ ] Start new container
- [ ] Check logs for debug output
- [ ] Verify assets load with correct MIME types
- [ ] Test app in browser (no console errors)
- [ ] Verify all routes work

## 🚀 Quick Commands

```bash
# Full rebuild and restart
git pull origin main
docker build -t incident-commander:latest .
docker-compose down
docker-compose up -d
docker logs -f <container-id>
```

## 📝 What Changed

**Commit:** `736b506`

**Changes:**
1. Added debug logging to see exact paths
2. Added charset to MIME types
3. Logs will show if assets directory exists and what files are in it

**Files Modified:**
- `server/static.ts` - Enhanced logging and MIME types

## ✅ Expected Result

After redeployment:

1. **Console logs should show:**
   ```
   [static] __dirname: /app/dist
   [static] Looking for static files at: /app/public
   [static] Exists: true
   [static] Assets path: /app/public/assets
   [static] Assets exists: true
   [static] Assets files: index-CUdQjczV.css, index-DrNCLeQh.js
   ```

2. **Browser should load:**
   - No MIME type errors
   - App displays correctly
   - All assets load

3. **curl test should show:**
   ```bash
   curl -I https://rootcause.greywolfx.io/assets/index-DrNCLeQh.js
   # Content-Type: application/javascript; charset=utf-8
   ```

## 🆘 If Nothing Works

Contact me with:
1. Docker logs output
2. Output of: `docker exec -it <container-id> ls -la /app/`
3. Output of: `docker exec -it <container-id> ls -la /app/public/`
4. Browser console errors

---

**Status:** Waiting for production rebuild  
**Next Action:** Rebuild Docker image and redeploy  
**ETA:** 5-10 minutes
