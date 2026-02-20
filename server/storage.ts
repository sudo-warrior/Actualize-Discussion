import { type Incident, type InsertIncident, incidents, type ApiKey, type InsertApiKey, apiKeys, type Template, type InsertTemplate, templates, type Tag, type InsertTag, tags, incidentTags, favorites } from "@shared/schema";
import { desc, eq, and, sql, inArray } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createIncident(incident: InsertIncident): Promise<Incident>;
  getIncident(id: string): Promise<Incident | undefined>;
  getAllIncidents(): Promise<Incident[]>;
  getIncidentsByUser(userId: string): Promise<Incident[]>;
  updateIncidentStatus(id: string, status: Incident["status"]): Promise<Incident | undefined>;
  toggleStepCompletion(id: string, stepIndex: number): Promise<Incident | undefined>;
  completeAllSteps(id: string, stepIndices: number[]): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
  bulkUpdateStatus(ids: string[], status: Incident["status"], userId: string): Promise<number>;
  bulkDeleteIncidents(ids: string[], userId: string): Promise<number>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  incrementApiKeyUsage(id: string): Promise<void>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  revokeApiKey(userId: string, id: string): Promise<boolean>;
  saveStepGuidance(id: string, stepIndex: number, guidance: string): Promise<Incident | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplatesByUser(userId: string): Promise<Template[]>;
  deleteTemplate(id: string, userId: string): Promise<boolean>;
  createTag(tag: InsertTag): Promise<Tag>;
  getAllTags(): Promise<Tag[]>;
  addTagToIncident(incidentId: string, tagId: string): Promise<void>;
  removeTagFromIncident(incidentId: string, tagId: string): Promise<void>;
  getIncidentTags(incidentId: string): Promise<Tag[]>;
  bulkTagIncidents(incidentIds: string[], tagId: string): Promise<void>;
  addFavorite(userId: string, incidentId: string): Promise<void>;
  removeFavorite(userId: string, incidentId: string): Promise<void>;
  getFavorites(userId: string): Promise<string[]>;
  getUnresolvedCount(userId: string): Promise<number>;
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

  async completeAllSteps(id: string, stepIndices: number[]): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ completedSteps: stepIndices })
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

  async bulkUpdateStatus(ids: string[], status: Incident["status"], userId: string): Promise<number> {
    const result = await db.update(incidents).set({ status }).where(and(inArray(incidents.id, ids), eq(incidents.userId, userId))).returning();
    return result.length;
  }

  async bulkDeleteIncidents(ids: string[], userId: string): Promise<number> {
    const result = await db.delete(incidents).where(and(inArray(incidents.id, ids), eq(incidents.userId, userId))).returning();
    return result.length;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template as any).returning();
    return created;
  }

  async getTemplatesByUser(userId: string): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.userId, userId)).orderBy(desc(templates.createdAt));
  }

  async deleteTemplate(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId))).returning();
    return result.length > 0;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [created] = await db.insert(tags).values(tag as any).returning();
    return created;
  }

  async getAllTags(): Promise<Tag[]> {
    return db.select().from(tags).orderBy(tags.name);
  }

  async addTagToIncident(incidentId: string, tagId: string): Promise<void> {
    await db.insert(incidentTags).values({ incidentId, tagId }).onConflictDoNothing();
  }

  async removeTagFromIncident(incidentId: string, tagId: string): Promise<void> {
    await db.delete(incidentTags).where(and(eq(incidentTags.incidentId, incidentId), eq(incidentTags.tagId, tagId)));
  }

  async getIncidentTags(incidentId: string): Promise<Tag[]> {
    const result = await db.select({ tag: tags }).from(incidentTags).innerJoin(tags, eq(incidentTags.tagId, tags.id)).where(eq(incidentTags.incidentId, incidentId));
    return result.map(r => r.tag);
  }

  async bulkTagIncidents(incidentIds: string[], tagId: string): Promise<void> {
    const values = incidentIds.map(id => ({ incidentId: id, tagId }));
    await db.insert(incidentTags).values(values).onConflictDoNothing();
  }

  async addFavorite(userId: string, incidentId: string): Promise<void> {
    await db.insert(favorites).values({ userId, incidentId }).onConflictDoNothing();
  }

  async removeFavorite(userId: string, incidentId: string): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.incidentId, incidentId)));
  }

  async getFavorites(userId: string): Promise<string[]> {
    const result = await db.select({ incidentId: favorites.incidentId }).from(favorites).where(eq(favorites.userId, userId));
    return result.map(r => r.incidentId);
  }

  async getUnresolvedCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(incidents).where(and(eq(incidents.userId, userId), eq(incidents.status, "analyzing")));
    return result[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();
