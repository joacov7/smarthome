-- Patch: add alert_status enum and status column to alerts
-- Run after 001_initial.sql

CREATE TYPE alert_status AS ENUM ('open','acked','resolved');

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS status alert_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS acked_by UUID,
  ADD COLUMN IF NOT EXISTS acked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(tenant_id, device_id);
