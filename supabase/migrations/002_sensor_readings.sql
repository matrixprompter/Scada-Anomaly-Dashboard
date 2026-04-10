-- P1-102: sensor_readings tablosu
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

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings (device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_anomaly ON sensor_readings (is_anomaly) WHERE is_anomaly = true;
