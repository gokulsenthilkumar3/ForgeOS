-- Phase 3 Supabase Schema Extensions
-- Run in Supabase SQL Editor after Phase 1 schema

-- Alert Rules
CREATE TABLE alert_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID REFERENCES db_connections(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  conditions       JSONB NOT NULL DEFAULT '[]',
  notify_channels  TEXT[] NOT NULL DEFAULT '{}',
  webhook_url      TEXT,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_rules_connection ON alert_rules(connection_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;

-- Alert Firings (history of fired alerts)
CREATE TABLE alert_firings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  connection_id    UUID REFERENCES db_connections(id),
  severity         TEXT NOT NULL,
  event_id         UUID REFERENCES audit_events(id),
  event_snapshot   JSONB,
  fired_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_firings_rule    ON alert_firings(rule_id);
CREATE INDEX idx_alert_firings_conn    ON alert_firings(connection_id);
CREATE INDEX idx_alert_firings_fired   ON alert_firings(fired_at DESC);
CREATE INDEX idx_alert_firings_severity ON alert_firings(severity);

-- Stats RPCs (used by EventsService.getEventStats)
CREATE OR REPLACE FUNCTION dbpulse_stats_by_operation(p_connection_id UUID)
RETURNS TABLE(operation TEXT, count BIGINT) AS $$
  SELECT operation, COUNT(*) AS count
  FROM audit_events
  WHERE connection_id = p_connection_id
  GROUP BY operation
  ORDER BY count DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION dbpulse_stats_by_table(p_connection_id UUID)
RETURNS TABLE(table_name TEXT, count BIGINT) AS $$
  SELECT table_name, COUNT(*) AS count
  FROM audit_events
  WHERE connection_id = p_connection_id
  GROUP BY table_name
  ORDER BY count DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION dbpulse_stats_by_actor(p_connection_id UUID)
RETURNS TABLE(actor TEXT, count BIGINT) AS $$
  SELECT actor, COUNT(*) AS count
  FROM audit_events
  WHERE connection_id = p_connection_id
  GROUP BY actor
  ORDER BY count DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- Row Level Security (basic — tighten per your auth setup)
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_firings ENABLE ROW LEVEL SECURITY;
