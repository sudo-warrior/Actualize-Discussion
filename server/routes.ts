import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";
import { analyzeLogsSchema } from "@shared/schema";
import { analyzeLogs, getStepGuidance } from "./analyzer";
import { isAuthenticated } from "./auth";

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function apiKeyAuth(req: any, res: Response, next: NextFunction) {
  const header = req.headers["authorization"] || req.headers["x-api-key"];
  let token: string | undefined;

  if (typeof header === "string") {
    token = header.startsWith("Bearer ") ? header.slice(7) : header;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing API key. Include it as Authorization: Bearer <key> or X-API-Key header." });
  }

  const keyHash = hashApiKey(token);
  const apiKey = await storage.findApiKeyByHash(keyHash);
  if (!apiKey) {
    return res.status(401).json({ error: "Invalid or revoked API key." });
  }

  storage.updateApiKeyLastUsed(apiKey.id).catch(() => {});

  req.apiUserId = apiKey.userId;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/incidents/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = analyzeLogsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { logs } = parsed.data;
      const analysis = await analyzeLogs(logs);

      const incident = await storage.createIncident({
        title: analysis.title,
        severity: analysis.severity,
        status: "resolved",
        confidence: analysis.confidence,
        rawLogs: logs,
        rootCause: analysis.rootCause,
        fix: analysis.fix,
        evidence: analysis.evidence,
        nextSteps: analysis.nextSteps,
        userId,
      });

      return res.status(201).json(incident);
    } catch (error) {
      console.error("Analysis error:", error);
      return res.status(500).json({ message: "Analysis failed. Please try again." });
    }
  });

  app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const incidents = await storage.getIncidentsByUser(userId);
    return res.json(incidents);
  });

  app.get("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    const userId = req.user.id;
    if (incident.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(incident);
  });

  app.patch("/api/incidents/:id/status", isAuthenticated, async (req: any, res) => {
    const { status } = req.body;
    if (!["analyzing", "resolved", "critical"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const userId = req.user.id;
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await storage.updateIncidentStatus(req.params.id as string, status);
    return res.json(updated);
  });

  app.patch("/api/incidents/:id/steps/:stepIndex", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const stepIndex = parseInt(req.params.stepIndex, 10);
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= incident.nextSteps.length) {
      return res.status(400).json({ message: "Invalid step index" });
    }
    const updated = await storage.toggleStepCompletion(req.params.id as string, stepIndex);
    return res.json(updated);
  });

  app.post("/api/incidents/:id/steps/:stepIndex/guidance", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const stepIndex = parseInt(req.params.stepIndex, 10);
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= incident.nextSteps.length) {
      return res.status(400).json({ message: "Invalid step index" });
    }
    
    // Return cached guidance if available
    if (incident.stepGuidance?.[stepIndex]) {
      return res.json({ guidance: incident.stepGuidance[stepIndex], cached: true });
    }
    
    try {
      const guidance = await getStepGuidance(incident.nextSteps[stepIndex], {
        rootCause: incident.rootCause,
        fix: incident.fix,
        rawLogs: incident.rawLogs.slice(0, 2000),
      });
      
      // Save guidance to DB
      await storage.saveStepGuidance(req.params.id as string, stepIndex, guidance);
      
      return res.json({ guidance, cached: false });
    } catch (error) {
      console.error("Guidance error:", error);
      return res.status(500).json({ message: "Failed to generate guidance." });
    }
  });

  app.delete("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await storage.deleteIncident(req.params.id as string);
    return res.json({ success: true });
  });

  app.get("/api/incidents/stats/summary", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const incidents = await storage.getIncidentsByUser(userId);
    const total = incidents.length;
    const critical = incidents.filter(i => i.severity === "critical").length;
    const high = incidents.filter(i => i.severity === "high").length;
    const medium = incidents.filter(i => i.severity === "medium").length;
    const low = incidents.filter(i => i.severity === "low").length;
    const avgConfidence = total > 0
      ? Math.round(incidents.reduce((sum, i) => sum + i.confidence, 0) / total)
      : 0;

    const last24h = incidents.filter(i => {
      const created = new Date(i.createdAt);
      return Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
    });

    const hourBuckets: Record<string, { incidents: number; resolved: number }> = {};
    for (let h = 0; h < 24; h += 4) {
      const label = `${h.toString().padStart(2, "0")}:00`;
      hourBuckets[label] = { incidents: 0, resolved: 0 };
    }

    for (const inc of last24h) {
      const hour = new Date(inc.createdAt).getHours();
      const bucket = Math.floor(hour / 4) * 4;
      const label = `${bucket.toString().padStart(2, "0")}:00`;
      if (hourBuckets[label]) {
        hourBuckets[label].incidents++;
        if (inc.status === "resolved") hourBuckets[label].resolved++;
      }
    }

    const volumeData = Object.entries(hourBuckets).map(([time, data]) => ({
      time,
      incidents: data.incidents,
      auto_resolved: data.resolved,
    }));

    return res.json({
      total,
      critical,
      high,
      medium,
      low,
      avgConfidence,
      volumeData,
      recentIncidents: incidents.slice(0, 10),
    });
  });

  // === API Key Management (session-protected) ===

  app.post("/api/keys", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "API key name is required." });
    }

    const rawKey = `ic_${randomBytes(32).toString("hex")}`;
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 10);

    const apiKey = await storage.createApiKey({
      userId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      revoked: false,
    });

    return res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
    });
  });

  app.get("/api/keys", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const keys = await storage.getApiKeysByUser(userId);
    return res.json(keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      revoked: k.revoked,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })));
  });

  app.delete("/api/keys/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const revoked = await storage.revokeApiKey(userId, req.params.id as string);
    if (!revoked) return res.status(404).json({ message: "API key not found." });
    return res.json({ success: true });
  });

  // === Developer API v1 (API key auth) ===

  app.post("/api/v1/incidents/analyze", apiKeyAuth, async (req: any, res) => {
    try {
      const parsed = analyzeLogsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { logs } = parsed.data;
      const analysis = await analyzeLogs(logs);
      const incident = await storage.createIncident({
        title: analysis.title,
        severity: analysis.severity,
        status: "resolved",
        confidence: analysis.confidence,
        rawLogs: logs,
        rootCause: analysis.rootCause,
        fix: analysis.fix,
        evidence: analysis.evidence,
        nextSteps: analysis.nextSteps,
        userId: req.apiUserId,
      });
      return res.status(201).json(incident);
    } catch (error) {
      console.error("API v1 analysis error:", error);
      return res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  });

  app.get("/api/v1/incidents", apiKeyAuth, async (req: any, res) => {
    const incidents = await storage.getIncidentsByUser(req.apiUserId);
    return res.json({ data: incidents, total: incidents.length });
  });

  app.get("/api/v1/incidents/:id", apiKeyAuth, async (req: any, res) => {
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) return res.status(404).json({ error: "Incident not found." });
    if (incident.userId !== req.apiUserId) return res.status(403).json({ error: "Forbidden." });
    return res.json(incident);
  });

  app.patch("/api/v1/incidents/:id/status", apiKeyAuth, async (req: any, res) => {
    const { status } = req.body;
    if (!["analyzing", "resolved", "critical"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be: analyzing, resolved, or critical." });
    }
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) return res.status(404).json({ error: "Incident not found." });
    if (incident.userId !== req.apiUserId) return res.status(403).json({ error: "Forbidden." });
    const updated = await storage.updateIncidentStatus(req.params.id as string, status);
    return res.json(updated);
  });

  app.delete("/api/v1/incidents/:id", apiKeyAuth, async (req: any, res) => {
    const incident = await storage.getIncident(req.params.id as string);
    if (!incident) return res.status(404).json({ error: "Incident not found." });
    if (incident.userId !== req.apiUserId) return res.status(403).json({ error: "Forbidden." });
    await storage.deleteIncident(req.params.id as string);
    return res.json({ success: true });
  });

  return httpServer;
}
