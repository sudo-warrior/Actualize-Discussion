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
  requestCount: integer("request_count").notNull().default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow().notNull(),
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
  stepGuidance: text("step_guidance").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  sampleLogs: text("sample_logs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incidentTags = pgTable("incident_tags", {
  incidentId: varchar("incident_id").notNull(),
  tagId: varchar("tag_id").notNull(),
});

export const favorites = pgTable("favorites", {
  userId: varchar("user_id").notNull(),
  incidentId: varchar("incident_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const analyzeLogsSchema = z.object({
  logs: z.string().min(1, "Logs cannot be empty"),
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type AnalyzeLogsInput = z.infer<typeof analyzeLogsSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Favorite = typeof favorites.$inferSelect;

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().$type<"admin" | "operator" | "viewer">().default("operator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export const incidentAssignments = pgTable("incident_assignments", {
  incidentId: varchar("incident_id").notNull(),
  assignedTo: varchar("assigned_to").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncidentAssignmentSchema = createInsertSchema(incidentAssignments).omit({
  createdAt: true,
});

export type InsertIncidentAssignment = z.infer<typeof insertIncidentAssignmentSchema>;
export type IncidentAssignment = typeof incidentAssignments.$inferSelect;

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  email: varchar("email").notNull(),
  criticalAlerts: boolean("critical_alerts").notNull().default(true),
  resolvedAlerts: boolean("resolved_alerts").notNull().default(false),
  digestFrequency: text("digest_frequency").notNull().$type<"none" | "daily" | "weekly">().default("none"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
