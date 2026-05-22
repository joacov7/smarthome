-- ============================================================
--  GuayCore — Schema inicial
--  PostgreSQL 15 + TimescaleDB
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- búsqueda por texto
CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- time-series

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE plan_tier AS ENUM ('free','starter','pro','enterprise');
CREATE TYPE user_role AS ENUM ('super_admin','org_owner','org_admin','org_member','device','api_key');
CREATE TYPE device_status AS ENUM ('online','offline','provisioning','suspended');
CREATE TYPE event_severity AS ENUM ('info','warning','error','critical');
CREATE TYPE ota_status AS ENUM ('draft','active','paused','completed','rolled_back');

-- ── ORGANIZATIONS (tenants) ───────────────────────────────────

CREATE TABLE organizations (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         VARCHAR(80) NOT NULL UNIQUE,
  name         VARCHAR(120) NOT NULL,
  logo_url     TEXT,
  plan         plan_tier   NOT NULL DEFAULT 'free',
  plan_limits  JSONB       NOT NULL DEFAULT '{
    "maxDevices": 10,
    "maxUsers": 5,
    "retentionDays": 30,
    "apiRateLimit": 1000
  }',
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS ─────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(254) NOT NULL,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80),
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'org_member',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  metadata      JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Un email es único dentro de un tenant
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant    ON users(tenant_id);
CREATE INDEX idx_users_email     ON users(email);

-- ── DEVICES ───────────────────────────────────────────────────

CREATE TABLE devices (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_key       VARCHAR(64)   NOT NULL UNIQUE,  -- username MQTT
  device_secret    TEXT          NOT NULL,          -- hasheado bcrypt
  name             VARCHAR(120)  NOT NULL,
  vertical         VARCHAR(40),  -- guayhome | logiguay | guaycold | ...
  device_type      VARCHAR(60),  -- relay_module | gps_tracker | temp_sensor | ...
  status           device_status NOT NULL DEFAULT 'provisioning',
  firmware_version VARCHAR(20),
  hardware_model   VARCHAR(60),
  ip_address       INET,
  last_seen_at     TIMESTAMPTZ,
  remote_config    JSONB         NOT NULL DEFAULT '{}',
  capabilities     JSONB         NOT NULL DEFAULT '[]',
  tags             JSONB         NOT NULL DEFAULT '{}',
  metadata         JSONB         NOT NULL DEFAULT '{}',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_tenant   ON devices(tenant_id);
CREATE INDEX idx_devices_key      ON devices(device_key);
CREATE INDEX idx_devices_status   ON devices(tenant_id, status);
CREATE INDEX idx_devices_vertical ON devices(tenant_id, vertical);
-- Búsqueda por tag: WHERE tags @> '{"zona": "norte"}'
CREATE INDEX idx_devices_tags     ON devices USING GIN(tags);

-- ── TELEMETRY (TimescaleDB hypertable) ────────────────────────

CREATE TABLE telemetry (
  ts          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  device_id   UUID          NOT NULL,
  tenant_id   UUID          NOT NULL,
  data        JSONB         NOT NULL,
  rssi        SMALLINT,
  PRIMARY KEY (ts, device_id)
);

-- Convertir en hypertable: particiona por ts (chunks de 1 día)
SELECT create_hypertable('telemetry', 'ts', chunk_time_interval => INTERVAL '1 day');

-- Compresión automática para datos > 7 días (ahorra ~90% de espacio)
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id',
  timescaledb.compress_orderby   = 'ts DESC'
);

SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- Retención: borrar datos > 90 días (configurable por plan)
-- SELECT add_retention_policy('telemetry', INTERVAL '90 days');

CREATE INDEX idx_telemetry_tenant_device ON telemetry(tenant_id, device_id, ts DESC);
CREATE INDEX idx_telemetry_tenant_ts     ON telemetry(tenant_id, ts DESC);
-- Búsqueda dentro del JSONB: WHERE data @> '{"alert": true}'
CREATE INDEX idx_telemetry_data          ON telemetry USING GIN(data);

-- ── DEVICE EVENTS ─────────────────────────────────────────────

CREATE TABLE device_events (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID          NOT NULL,
  device_id      UUID          NOT NULL,
  type           VARCHAR(80)   NOT NULL,   -- door_opened | temp_alert | offline | ...
  severity       event_severity NOT NULL DEFAULT 'info',
  correlation_id UUID,
  data           JSONB         NOT NULL DEFAULT '{}',
  processed      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_tenant_device ON device_events(tenant_id, device_id, created_at DESC);
CREATE INDEX idx_events_severity      ON device_events(tenant_id, severity, created_at DESC);
CREATE INDEX idx_events_unprocessed   ON device_events(processed, created_at) WHERE processed = FALSE;

-- ── RULES ─────────────────────────────────────────────────────

CREATE TABLE rules (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID        NOT NULL,
  name              VARCHAR(120) NOT NULL,
  description       TEXT,
  device_id         UUID,        -- NULL = aplica a todos
  device_tag        VARCHAR(80), -- NULL = aplica a todos
  conditions        JSONB       NOT NULL DEFAULT '[]',
  condition_logic   VARCHAR(3)  NOT NULL DEFAULT 'and',  -- 'and' | 'or'
  actions           JSONB       NOT NULL DEFAULT '[]',
  cooldown_seconds  INTEGER     NOT NULL DEFAULT 300,
  last_triggered_at TIMESTAMPTZ,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_tenant ON rules(tenant_id, is_active);

-- ── ALERTS ────────────────────────────────────────────────────

CREATE TABLE alerts (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID          NOT NULL,
  device_id   UUID,
  rule_id     UUID          REFERENCES rules(id) ON DELETE SET NULL,
  title       VARCHAR(200)  NOT NULL,
  message     TEXT,
  severity    event_severity NOT NULL DEFAULT 'warning',
  channels    JSONB         NOT NULL DEFAULT '[]',  -- ['email','telegram']
  sent_at     TIMESTAMPTZ,
  ack_at      TIMESTAMPTZ,
  ack_by      UUID,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id, created_at DESC);

-- ── FIRMWARE VERSIONS ─────────────────────────────────────────

CREATE TABLE firmware_versions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID        NOT NULL,
  version        VARCHAR(20) NOT NULL,
  hardware_model VARCHAR(60),
  download_url   TEXT        NOT NULL,
  sha256         VARCHAR(64) NOT NULL,
  size_bytes     INTEGER     NOT NULL,
  changelog      TEXT,
  is_stable      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── OTA CAMPAIGNS ─────────────────────────────────────────────

CREATE TABLE ota_campaigns (
  id                  UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID       NOT NULL,
  name                VARCHAR(120) NOT NULL,
  firmware_version_id UUID       NOT NULL REFERENCES firmware_versions(id),
  target_filter       JSONB      NOT NULL DEFAULT '{}',
  status              ota_status NOT NULL DEFAULT 'draft',
  progress            JSONB      NOT NULL DEFAULT '{"total":0,"pending":0,"updating":0,"success":0,"failed":0}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GEOFENCES (Logiguay) ──────────────────────────────────────

CREATE TABLE geofences (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL,
  name        VARCHAR(120) NOT NULL,
  -- GeoJSON Polygon
  boundary    JSONB       NOT NULL,
  -- Radio en metros (para círculos) — alternativa a polygon
  center_lat  DOUBLE PRECISION,
  center_lng  DOUBLE PRECISION,
  radius_m    INTEGER,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_tenant ON geofences(tenant_id);

-- ── DRIVERS (Logiguay) ────────────────────────────────────────

CREATE TABLE drivers (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL,
  first_name  VARCHAR(80) NOT NULL,
  last_name   VARCHAR(80),
  license_no  VARCHAR(40),
  phone       VARCHAR(30),
  device_id   UUID,        -- vehículo/tracker asignado actualmente
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIPS (Logiguay) ──────────────────────────────────────────

CREATE TABLE trips (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID        NOT NULL,
  device_id  UUID        NOT NULL,
  driver_id  UUID        REFERENCES drivers(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at   TIMESTAMPTZ,
  distance_m INTEGER,
  max_speed  SMALLINT,
  avg_speed  SMALLINT,
  polyline   JSONB,       -- array de {lat,lng,ts} simplificado
  metadata   JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_trips_tenant_device ON trips(tenant_id, device_id, started_at DESC);

-- ── CAMERA INTEGRATIONS ───────────────────────────────────────

CREATE TABLE camera_integrations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL,
  name        VARCHAR(120) NOT NULL,
  brand       VARCHAR(40) NOT NULL,   -- hikvision | dahua | onvif | rtsp
  host        INET,
  port        INTEGER     DEFAULT 80,
  username    VARCHAR(80),
  password    TEXT,                   -- cifrado en app layer
  rtsp_url    TEXT,
  onvif_path  TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cameras_tenant ON camera_integrations(tenant_id);

-- ── AUDIT LOG ─────────────────────────────────────────────────
-- Inmutable: solo INSERT, nunca UPDATE/DELETE

CREATE TABLE audit_log (
  id         BIGSERIAL   PRIMARY KEY,
  tenant_id  UUID        NOT NULL,
  user_id    UUID,
  action     VARCHAR(80) NOT NULL,   -- user.login | device.create | rule.trigger | ...
  resource   VARCHAR(80),
  resource_id UUID,
  ip         INET,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);

-- ── Función helper: updated_at automático ────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas con updated_at
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['organizations','users','devices','rules'])
  LOOP EXECUTE format('CREATE TRIGGER trg_%s_updated_at
    BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
