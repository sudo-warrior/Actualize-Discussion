import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeLogsSchema } from "@shared/schema";
import { analyzeLogs, getStepGuidance } from "./analyzer";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.post("/api/incidents/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = analyzeLogsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    try {
      const guidance = await getStepGuidance(incident.nextSteps[stepIndex], {
        rootCause: incident.rootCause,
        fix: incident.fix,
        rawLogs: incident.rawLogs.slice(0, 2000),
      });
      return res.json({ guidance });
    } catch (error) {
      console.error("Guidance error:", error);
      return res.status(500).json({ message: "Failed to generate guidance." });
    }
  });

  app.delete("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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

  return httpServer;
}
