-- P1-107: pgvector ivfflat index (benzer anomali aramasi icin)
-- Not: Bu index en az 100 satir veri oldugunda etkili olur.
-- Veri yokken olusturulursa hata vermez ama performans etkisi olmaz.
CREATE INDEX IF NOT EXISTS idx_sensor_readings_embedding
  ON sensor_readings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
