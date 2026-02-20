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

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
