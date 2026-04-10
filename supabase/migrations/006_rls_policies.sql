-- P1-106: Row Level Security politikalari

-- sensor_readings RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensor_readings_select_anon"
  ON sensor_readings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "sensor_readings_all_authenticated"
  ON sensor_readings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- anomaly_events RLS
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomaly_events_select_anon"
  ON anomaly_events FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anomaly_events_all_authenticated"
  ON anomaly_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- model_metrics RLS (herkes okuyabilir)
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "model_metrics_select_anon"
  ON model_metrics FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "model_metrics_all_authenticated"
  ON model_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- devices RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_anon"
  ON devices FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "devices_all_authenticated"
  ON devices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
