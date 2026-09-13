-- Phase 1 Supabase Schema
-- Run this first before phase 3 schema

CREATE TABLE db_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  engine        TEXT NOT NULL CHECK (engine IN ('postgres', 'mysql')),
  host          TEXT,
  port          INTEGER,
  database_name TEXT,
  credentials   TEXT,   -- AES-256-GCM encrypted blob
  status        TEXT DEFAULT 'disconnected',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES db_connections(id) ON DELETE CASCADE,
  database_name TEXT NOT NULL,
  schema_name   TEXT,
  table_name    TEXT,
  operation     TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE','TRUNCATE')),
  actor         TEXT NOT NULL,
  session_info  JSONB,
  before_state  JSONB,
  after_state   JSONB,
  diff_columns  JSONB,
  raw_query     TEXT,
  event_hash    TEXT UNIQUE,   -- dedup constraint
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_connection ON audit_events(connection_id);
CREATE INDEX idx_audit_events_table      ON audit_events(table_name);
CREATE INDEX idx_audit_events_actor      ON audit_events(actor);
CREATE INDEX idx_audit_events_operation  ON audit_events(operation);
CREATE INDEX idx_audit_events_created    ON audit_events(created_at DESC);
-- Partial index for UPDATE events (most common for diff queries)
CREATE INDEX idx_audit_events_updates    ON audit_events(table_name, created_at DESC)
  WHERE operation = 'UPDATE';

-- Row Level Security
ALTER TABLE db_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
