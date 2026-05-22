-- ============================================================
--  GuayHome vertical — schema
--  Run after 002_alerts_status.sql
-- ============================================================

-- ── ROOMS ─────────────────────────────────────────────────────
-- Physical spaces within a tenant's home (living room, bedroom, etc.)

CREATE TABLE guayhome_rooms (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID         NOT NULL,
  name        VARCHAR(120) NOT NULL,
  floor       INTEGER      NOT NULL DEFAULT 0,
  icon        VARCHAR(80),                          -- e.g. 'living-room', 'bedroom'
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guayhome_rooms_tenant ON guayhome_rooms(tenant_id);

-- ── SCENES ────────────────────────────────────────────────────
-- Named sequences of device commands triggered as a unit.
-- actions: [{ deviceId, command: {}, delayMs? }, ...]

CREATE TABLE guayhome_scenes (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID         NOT NULL,
  name        VARCHAR(120) NOT NULL,
  icon        VARCHAR(80),                          -- e.g. 'movie-night', 'good-morning'
  actions     JSONB        NOT NULL DEFAULT '[]',   -- SceneAction[]
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guayhome_scenes_tenant ON guayhome_scenes(tenant_id);

-- ── HOME DEVICES ──────────────────────────────────────────────
-- Links core Device records into a room with UI metadata.
-- deviceId references devices.id (UUID) — no FK to allow cross-schema flexibility.
-- roomId references guayhome_rooms.id with SET NULL on room delete.

CREATE TABLE guayhome_devices (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID        NOT NULL,
  device_id    UUID        NOT NULL,               -- core Device UUID
  room_id      UUID        REFERENCES guayhome_rooms(id) ON DELETE SET NULL,
  display_name VARCHAR(120),                        -- UI label override
  icon         VARCHAR(80),                         -- e.g. 'thermostat', 'light-bulb', 'door-lock'
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  capabilities JSONB       NOT NULL DEFAULT '[]',  -- e.g. ['on_off', 'dimmer', 'color']
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, device_id)
);

CREATE INDEX idx_guayhome_devices_tenant     ON guayhome_devices(tenant_id);
CREATE INDEX idx_guayhome_devices_room       ON guayhome_devices(tenant_id, room_id);
CREATE INDEX idx_guayhome_devices_device_id  ON guayhome_devices(device_id);

-- ── updated_at triggers ───────────────────────────────────────
-- Reuses the set_updated_at() function created in 001_initial.sql

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['guayhome_rooms','guayhome_scenes','guayhome_devices'])
  LOOP EXECUTE format('CREATE TRIGGER trg_%s_updated_at
    BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
