-- Ornek cihazlar
INSERT INTO devices (id, name, location, sensor_count, status, current_rul, metadata) VALUES
  ('DEVICE-001', 'Turbin A1', 'Makine Dairesi - Kat 1', 14, 'active', 185.5, '{"type": "steam_turbine", "capacity_mw": 150}'),
  ('DEVICE-002', 'Turbin A2', 'Makine Dairesi - Kat 1', 14, 'active', 92.3, '{"type": "steam_turbine", "capacity_mw": 150}'),
  ('DEVICE-003', 'Pompa B1', 'Su Arıtma Ünitesi', 14, 'active', 210.0, '{"type": "feed_pump", "capacity_lph": 5000}'),
  ('DEVICE-004', 'Kompresör C1', 'Hava Kompresör Odası', 14, 'active', 45.2, '{"type": "air_compressor", "pressure_bar": 12}'),
  ('DEVICE-005', 'Jeneratör D1', 'Jeneratör Binası', 14, 'active', 156.8, '{"type": "generator", "capacity_mw": 200}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  current_rul = EXCLUDED.current_rul,
  metadata = EXCLUDED.metadata;
