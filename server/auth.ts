import type { RequestHandler } from "express";
import { supabase } from "./supabase";

// Cache for validated tokens (5 min TTL)
const tokenCache = new Map<string, { user: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    req.user = cached.user;
    return next();
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    tokenCache.delete(token);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Cache the validated token
  tokenCache.set(token, { user, expires: Date.now() + CACHE_TTL });
  
  req.user = user;
  next();
};
