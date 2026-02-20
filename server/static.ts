import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const publicPath = path.resolve(__dirname, "../public");
  
  console.log(`[static] __dirname: ${__dirname}`);
  console.log(`[static] publicPath: ${publicPath}`);
  console.log(`[static] Exists: ${fs.existsSync(publicPath)}`);
  
  if (fs.existsSync(publicPath)) {
    const assetsPath = path.join(publicPath, 'assets');
    console.log(`[static] Assets path: ${assetsPath}`);
    console.log(`[static] Assets exists: ${fs.existsSync(assetsPath)}`);
    
    if (fs.existsSync(assetsPath)) {
      try {
        const files = fs.readdirSync(assetsPath);
        console.log(`[static] Assets files: ${files.join(', ')}`);
      } catch (e) {
        console.log(`[static] Error reading assets: ${e}`);
      }
    }
  }
  
  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the build directory: ${publicPath}, make sure to build the client first`,
    );
  }

  // Serve static files - this MUST come first
  app.use(express.static(publicPath, {
    index: false, // Don't serve index.html automatically
    setHeaders: (res: Response, filePath: string) => {
      console.log(`[static] express.static serving: ${filePath}`);
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  // SPA fallback - serve index.html for non-file routes
  app.get('*', (req: Request, res: Response) => {
    console.log(`[static] SPA fallback for: ${req.path}`);
    
    // If it looks like a file request that wasn't found, 404 it
    if (req.path.match(/\.[a-z]+$/i)) {
      console.log(`[static] File not found: ${req.path}`);
      return res.status(404).send('Not found');
    }
    
    // Otherwise serve index.html for SPA routing
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}
