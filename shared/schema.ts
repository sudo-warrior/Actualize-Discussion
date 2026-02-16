import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  revoked: boolean("revoked").notNull().default(false),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high" | "critical">(),
  status: text("status").notNull().$type<"analyzing" | "resolved" | "critical">().default("analyzing"),
  confidence: integer("confidence").notNull(),
  rawLogs: text("raw_logs").notNull(),
  rootCause: text("root_cause").notNull(),
  fix: text("fix").notNull(),
  evidence: text("evidence").array().notNull(),
  nextSteps: text("next_steps").array().notNull(),
  completedSteps: integer("completed_steps").array().notNull().default(sql`'{}'::integer[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
});

export const analyzeLogsSchema = z.object({
  logs: z.string().min(1, "Logs cannot be empty"),
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type AnalyzeLogsInput = z.infer<typeof analyzeLogsSchema>;
