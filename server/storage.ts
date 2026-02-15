import { type Incident, type InsertIncident, incidents } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  createIncident(incident: InsertIncident): Promise<Incident>;
  getIncident(id: string): Promise<Incident | undefined>;
  getAllIncidents(): Promise<Incident[]>;
  updateIncidentStatus(id: string, status: Incident["status"]): Promise<Incident | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [created] = await db.insert(incidents).values(incident).returning();
    return created;
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
  }

  async getAllIncidents(): Promise<Incident[]> {
    return db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async updateIncidentStatus(id: string, status: Incident["status"]): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ status })
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
