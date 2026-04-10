-- P1-103: anomaly_events tablosu
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

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_anomaly_events_device_id ON anomaly_events (device_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_detected_at ON anomaly_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events (severity);
