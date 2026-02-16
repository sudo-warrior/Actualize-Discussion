import { type Incident, type InsertIncident, incidents, type ApiKey, type InsertApiKey, apiKeys } from "@shared/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createIncident(incident: InsertIncident): Promise<Incident>;
  getIncident(id: string): Promise<Incident | undefined>;
  getAllIncidents(): Promise<Incident[]>;
  getIncidentsByUser(userId: string): Promise<Incident[]>;
  updateIncidentStatus(id: string, status: Incident["status"]): Promise<Incident | undefined>;
  toggleStepCompletion(id: string, stepIndex: number): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  incrementApiKeyUsage(id: string): Promise<void>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  revokeApiKey(userId: string, id: string): Promise<boolean>;
  saveStepGuidance(id: string, stepIndex: number, guidance: string): Promise<Incident | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [created] = await db.insert(incidents).values(incident as any).returning();
    return created;
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
  }

  async getAllIncidents(): Promise<Incident[]> {
    return db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async getIncidentsByUser(userId: string): Promise<Incident[]> {
    return db.select().from(incidents).where(eq(incidents.userId, userId)).orderBy(desc(incidents.createdAt));
  }

  async updateIncidentStatus(id: string, status: Incident["status"]): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ status })
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }

  async toggleStepCompletion(id: string, stepIndex: number): Promise<Incident | undefined> {
    const incident = await this.getIncident(id);
    if (!incident) return undefined;
    const completed = incident.completedSteps || [];
    const newCompleted = completed.includes(stepIndex)
      ? completed.filter(i => i !== stepIndex)
      : [...completed, stepIndex];
    const [updated] = await db
      .update(incidents)
      .set({ completedSteps: newCompleted })
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }

  async deleteIncident(id: string): Promise<boolean> {
    const result = await db.delete(incidents).where(eq(incidents.id, id)).returning();
    return result.length > 0;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey as any).returning();
    return created;
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)));
    return key;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    const key = await this.getApiKey(id);
    if (!key) return;

    const now = new Date();
    const lastReset = new Date(key.lastResetDate);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    // Reset counter if more than 24 hours have passed
    if (hoursSinceReset >= 24) {
      await db.update(apiKeys)
        .set({ 
          requestCount: 1, 
          lastResetDate: now,
          lastUsedAt: now 
        })
        .where(eq(apiKeys.id, id));
    } else {
      await db.update(apiKeys)
        .set({ 
          requestCount: sql`${apiKeys.requestCount} + 1`,
          lastUsedAt: now 
        })
        .where(eq(apiKeys.id, id));
    }
  }

  async getApiKey(id: string): Promise<typeof apiKeys.$inferSelect | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return key;
  }

  async revokeApiKey(userId: string, id: string): Promise<boolean> {
    const result = await db.update(apiKeys).set({ revoked: true }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))).returning();
    return result.length > 0;
  }

  async saveStepGuidance(id: string, stepIndex: number, guidance: string): Promise<Incident | undefined> {
    const incident = await this.getIncident(id);
    if (!incident) return undefined;
    const guidanceArray = incident.stepGuidance || [];
    guidanceArray[stepIndex] = guidance;
    const [updated] = await db.update(incidents).set({ stepGuidance: guidanceArray }).where(eq(incidents.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
