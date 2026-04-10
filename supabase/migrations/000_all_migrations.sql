-- ============================================
-- SCADA Anomali Dashboard - Tum Migration'lar
-- Supabase SQL Editor'da tek seferde calistir
-- ============================================

-- P1-101: pgvector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- P1-102: sensor_readings tablosu
-- ============================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  sensor_data jsonb NOT NULL DEFAULT '{}',
  embedding vector(64),
  is_anomaly boolean DEFAULT false,
  anomaly_score float8,
  rul_estimate float8,
  shap_values jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings (device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_anomaly ON sensor_readings (is_anomaly) WHERE is_anomaly = true;

-- ============================================
-- P1-103: anomaly_events tablosu
-- ============================================
CREATE TABLE IF NOT EXISTS anomaly_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  sensor_values jsonb,
  shap_top_feature text,
  model_version text,
  resolved_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_device_id ON anomaly_events (device_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_detected_at ON anomaly_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events (severity);

-- ============================================
-- P1-104: model_metrics tablosu
-- ============================================
CREATE TABLE IF NOT EXISTS model_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  trained_at timestamptz DEFAULT now(),
  accuracy float8,
  precision_score float8,
  recall_score float8,
  f1_score float8,
  auc_roc float8,
  rul_rmse float8,
  dataset_size int,
  hyperparams jsonb
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_model_name ON model_metrics (model_name);

-- ============================================
-- P1-105: devices tablosu
-- ============================================
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

-- ============================================
-- P1-106: Row Level Security
-- ============================================

-- sensor_readings
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensor_readings_select_anon"
  ON sensor_readings FOR SELECT TO anon USING (true);

CREATE POLICY "sensor_readings_all_authenticated"
  ON sensor_readings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- anomaly_events
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomaly_events_select_anon"
  ON anomaly_events FOR SELECT TO anon USING (true);

CREATE POLICY "anomaly_events_all_authenticated"
  ON anomaly_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- model_metrics
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "model_metrics_select_anon"
  ON model_metrics FOR SELECT TO anon USING (true);

CREATE POLICY "model_metrics_all_authenticated"
  ON model_metrics FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_anon"
  ON devices FOR SELECT TO anon USING (true);

CREATE POLICY "devices_all_authenticated"
  ON devices FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- P1-107: pgvector ivfflat index
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_embedding
  ON sensor_readings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- Realtime yayin: sensor_readings ve anomaly_events
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_events;

-- ============================================
-- Benzer anomali arama RPC fonksiyonu (pgvector)
-- ============================================
CREATE OR REPLACE FUNCTION match_similar_anomalies(
  query_embedding vector(64),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  device_id text,
  timestamp timestamptz,
  sensor_data jsonb,
  is_anomaly boolean,
  anomaly_score float8,
  rul_estimate float8,
  shap_values jsonb,
  similarity float8
)
LANGUAGE sql STABLE
AS $$
  SELECT
    sr.id,
    sr.device_id,
    sr.timestamp,
    sr.sensor_data,
    sr.is_anomaly,
    sr.anomaly_score,
    sr.rul_estimate,
    sr.shap_values,
    1 - (sr.embedding <=> query_embedding) AS similarity
  FROM sensor_readings sr
  WHERE sr.embedding IS NOT NULL
  ORDER BY sr.embedding <=> query_embedding
  LIMIT match_count;
$$;
