import { type Incident, type InsertIncident, incidents, type ApiKey, type InsertApiKey, apiKeys } from "@shared/schema";
import { desc, eq, and } from "drizzle-orm";
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
  revokeApiKey(userId: string, id: string): Promise<boolean>;
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

  async revokeApiKey(userId: string, id: string): Promise<boolean> {
    const result = await db.update(apiKeys).set({ revoked: true }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
