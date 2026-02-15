import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeLogsSchema } from "@shared/schema";
import { analyzeLogs } from "./analyzer";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/incidents/analyze", async (req, res) => {
    const parsed = analyzeLogsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const { logs } = parsed.data;
    const analysis = analyzeLogs(logs);

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
    });

    return res.status(201).json(incident);
  });

  app.get("/api/incidents", async (_req, res) => {
    const incidents = await storage.getAllIncidents();
    return res.json(incidents);
  });

  app.get("/api/incidents/:id", async (req, res) => {
    const incident = await storage.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    return res.json(incident);
  });

  app.patch("/api/incidents/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!["analyzing", "resolved", "critical"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateIncidentStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ message: "Incident not found" });
    }
    return res.json(updated);
  });

  return httpServer;
}
