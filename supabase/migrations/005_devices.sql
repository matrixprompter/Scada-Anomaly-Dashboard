-- P1-105: devices tablosu
CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  name text NOT NULL,
  location text,
  sensor_count int DEFAULT 10,
  status text DEFAULT 'active',
  last_seen timestamptz DEFAULT now(),
  current_rul float8,
  metadata jsonb DEFAULT '{}'
);
