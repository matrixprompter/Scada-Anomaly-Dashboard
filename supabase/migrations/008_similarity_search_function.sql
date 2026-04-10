-- P1-308 icin: pgvector benzer anomali arama RPC fonksiyonu
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
