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
      console.log(`[static] Serving file: ${filePath}`);
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
    console.log(`[static] Catch-all hit for: ${req.path}`);
    
    // Check if the requested file actually exists
    const requestedFile = path.join(publicPath, req.path);
    if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
      console.log(`[static] File exists but wasn't served by static middleware: ${requestedFile}`);
      // Let it 404 naturally
      return next();
    }
    
    // Don't serve index.html for asset requests that don't exist
    if (req.path.startsWith('/assets/') || 
        req.path.endsWith('.js') || 
        req.path.endsWith('.css') ||
        req.path.endsWith('.ico') ||
        req.path.endsWith('.jpg') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.svg')) {
      console.log(`[static] Asset request but file doesn't exist: ${req.path}`);
      return next();
    }
    
    // Serve index.html for all other routes (SPA routing)
    console.log(`[static] Serving index.html for SPA route: ${req.path}`);
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}
