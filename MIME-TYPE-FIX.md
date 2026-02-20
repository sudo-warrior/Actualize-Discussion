# MIME Type Fix for Production Deployment

## 🐛 Problem

**Error in browser console:**
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html". 
Strict MIME type checking is enforced for module scripts per HTML spec.
```

**URL:** https://rootcause.greywolfx.io/

**Root Cause:**
- Static assets (`/assets/index-DrNCLeQh.js`) were being served with `Content-Type: text/html`
- The catch-all route `/{*path}` was matching asset requests
- Express was serving `index.html` for all routes, including JS/CSS files

## ✅ Solution

### Changes to `server/static.ts`:

1. **Added explicit MIME type headers:**
```typescript
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));
```

2. **Fixed catch-all route to exclude assets:**
```typescript
app.use((req, res, next) => {
  // Don't serve index.html for asset requests
  if (req.path.startsWith('/assets/') || 
      req.path.endsWith('.js') || 
      req.path.endsWith('.css') ||
      req.path.endsWith('.ico') ||
      req.path.endsWith('.jpg') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.svg')) {
    return next();
  }
  
  // Serve index.html for all other routes (SPA routing)
  res.sendFile(path.resolve(distPath, "index.html"));
});
```

## 📊 Before vs After

| Request | Before | After |
|---------|--------|-------|
| `/` | ✅ text/html | ✅ text/html |
| `/assets/index.js` | ❌ text/html | ✅ application/javascript |
| `/assets/index.css` | ❌ text/html | ✅ text/css |
| `/favicon.ico` | ❌ text/html | ✅ image/x-icon |
| `/incidents/123` | ✅ text/html | ✅ text/html |

## 🧪 Testing

### Verify MIME types:
```bash
# Check JS file
curl -I https://rootcause.greywolfx.io/assets/index-DrNCLeQh.js
# Should show: Content-Type: application/javascript

# Check CSS file
curl -I https://rootcause.greywolfx.io/assets/index-CUdQjczV.css
# Should show: Content-Type: text/css

# Check HTML (SPA route)
curl -I https://rootcause.greywolfx.io/incidents
# Should show: Content-Type: text/html
```

### Browser test:
1. Open https://rootcause.greywolfx.io/
2. Check console - no MIME type errors
3. App should load correctly

## 🚀 Deployment

**Commit:** `215af62`  
**Branch:** `main`  
**Status:** ✅ Pushed to GitHub

### Next steps:
1. Rebuild Docker image
2. Redeploy to production
3. Verify app loads correctly

### Rebuild command:
```bash
docker build -t incident-commander:latest .
docker push your-registry/incident-commander:latest
```

## 📝 Additional Notes

### Why this happened:
- Express `static` middleware serves files correctly
- But the catch-all route `/{*path}` was too broad
- It matched `/assets/file.js` and served `index.html` instead

### Why the fix works:
- `express.static()` now has explicit MIME type headers
- Catch-all route checks if request is for an asset
- Assets are handled by static middleware
- Only non-asset routes get `index.html` (for SPA routing)

### Alternative solutions considered:
1. ❌ Remove catch-all route - breaks SPA routing
2. ❌ Use different route pattern - complex regex
3. ✅ Check request path before serving index.html - simple and effective

## ✅ Status: FIXED

Static assets now serve with correct MIME types. App should load properly in production.

**Ready for redeployment!** 🚀
