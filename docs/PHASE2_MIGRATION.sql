-- Phase 2: Comments, Activity Log, User Roles, and Incident Assignments
-- Run this SQL to add the new tables to your database

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- Activity log table for timeline
CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Incident assignments table
CREATE TABLE IF NOT EXISTS incident_assignments (
  incident_id VARCHAR NOT NULL,
  assigned_to VARCHAR NOT NULL,
  assigned_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (incident_id)
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL,
  critical_alerts BOOLEAN NOT NULL DEFAULT true,
  resolved_alerts BOOLEAN NOT NULL DEFAULT false,
  digest_frequency VARCHAR NOT NULL DEFAULT 'none' CHECK (digest_frequency IN ('none', 'daily', 'weekly')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_incident ON comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_activity_incident ON activity_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments ON incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
