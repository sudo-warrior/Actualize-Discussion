import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production, the server runs from /app/dist/index.cjs
  // So we need to go up one directory to find public
  const distPath = path.resolve(__dirname, "../public");
  
  console.log(`[static] Looking for static files at: ${distPath}`);
  console.log(`[static] Exists: ${fs.existsSync(distPath)}`);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files with proper MIME types
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Set correct MIME types for assets
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
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
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
