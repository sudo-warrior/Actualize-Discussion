import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production, the server runs from /app/dist/index.cjs
  // __dirname will be /app/dist, so ../public becomes /app/public
  // But we created a symlink: /app/public -> /app/dist/public
  const publicPath = path.resolve(__dirname, "../public");
  
  console.log(`[static] __dirname: ${__dirname}`);
  console.log(`[static] Looking for static files at: ${publicPath}`);
  console.log(`[static] Exists: ${fs.existsSync(publicPath)}`);
  
  if (fs.existsSync(publicPath)) {
    const assetsPath = path.join(publicPath, 'assets');
    console.log(`[static] Assets path: ${assetsPath}`);
    console.log(`[static] Assets exists: ${fs.existsSync(assetsPath)}`);
    
    if (fs.existsSync(assetsPath)) {
      const files = fs.readdirSync(assetsPath);
      console.log(`[static] Assets files: ${files.join(', ')}`);
    }
  }
  
  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the build directory: ${publicPath}, make sure to build the client first`,
    );
  }

  // Serve static files with proper MIME types
  app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
      // Set correct MIME types for assets
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  // Fall through to index.html only for non-asset routes
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
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}
