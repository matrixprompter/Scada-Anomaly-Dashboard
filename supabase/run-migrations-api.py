"""
Supabase Management API ile migration calistirici.
.env.local'daki SUPABASE_ACCESS_TOKENS ve NEXT_PUBLIC_SUPABASE_URL kullanir.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

# .env.local oku
env_path = Path(__file__).parent.parent / ".env.local"
env_vars = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            env_vars[key.strip()] = val.strip()

SUPABASE_URL = env_vars.get("NEXT_PUBLIC_SUPABASE_URL", "")
ACCESS_TOKEN = env_vars.get("SUPABASE_ACCESS_TOKENS", "")

if not SUPABASE_URL or not ACCESS_TOKEN:
    print("HATA: .env.local'da NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_ACCESS_TOKENS gerekli")
    sys.exit(1)

# Project ref: URL'den cikar (https://xxxxx.supabase.co -> xxxxx)
PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

print(f"Supabase Project: {PROJECT_REF}")
print(f"API URL: {API_URL}")
print()


def execute_sql(sql: str, label: str) -> bool:
    """Supabase Management API ile SQL calistir."""
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "supabase-migration/1.0",
    }
    body = json.dumps({"query": sql}).encode("utf-8")

    req = urllib.request.Request(API_URL, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] {label}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"  [HATA] {label}")
        print(f"    Status: {e.code}")
        try:
            err = json.loads(error_body)
            print(f"    Mesaj: {err.get('message', error_body)}")
        except Exception:
            print(f"    Detay: {error_body[:300]}")
        return False
    except Exception as e:
        print(f"  [HATA] {label}: {e}")
        return False


# Migration adimlari - her biri ayri calistirilir
MIGRATIONS = [
    (
        "P1-101: pgvector Extension",
        "CREATE EXTENSION IF NOT EXISTS vector;"
    ),
    (
        "P1-102: sensor_readings tablosu",
        """
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
        """
    ),
    (
        "P1-102: sensor_readings indexleri",
        """
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings (device_id);
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_anomaly ON sensor_readings (is_anomaly) WHERE is_anomaly = true;
        """
    ),
    (
        "P1-103: anomaly_events tablosu",
        """
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
        """
    ),
    (
        "P1-103: anomaly_events indexleri",
        """
        CREATE INDEX IF NOT EXISTS idx_anomaly_events_device_id ON anomaly_events (device_id);
        CREATE INDEX IF NOT EXISTS idx_anomaly_events_detected_at ON anomaly_events (detected_at DESC);
        CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events (severity);
        """
    ),
    (
        "P1-104: model_metrics tablosu",
        """
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
        """
    ),
    (
        "P1-105: devices tablosu",
        """
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
        """
    ),
    (
        "P1-106: RLS - sensor_readings",
        """
        ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "sensor_readings_select_anon"
          ON sensor_readings FOR SELECT TO anon USING (true);
        CREATE POLICY "sensor_readings_all_authenticated"
          ON sensor_readings FOR ALL TO authenticated
          USING (true) WITH CHECK (true);
        """
    ),
    (
        "P1-106: RLS - anomaly_events",
        """
        ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "anomaly_events_select_anon"
          ON anomaly_events FOR SELECT TO anon USING (true);
        CREATE POLICY "anomaly_events_all_authenticated"
          ON anomaly_events FOR ALL TO authenticated
          USING (true) WITH CHECK (true);
        """
    ),
    (
        "P1-106: RLS - model_metrics",
        """
        ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "model_metrics_select_anon"
          ON model_metrics FOR SELECT TO anon USING (true);
        CREATE POLICY "model_metrics_all_authenticated"
          ON model_metrics FOR ALL TO authenticated
          USING (true) WITH CHECK (true);
        """
    ),
    (
        "P1-106: RLS - devices",
        """
        ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "devices_select_anon"
          ON devices FOR SELECT TO anon USING (true);
        CREATE POLICY "devices_all_authenticated"
          ON devices FOR ALL TO authenticated
          USING (true) WITH CHECK (true);
        """
    ),
    (
        "P1-107: pgvector ivfflat index",
        """
        CREATE INDEX IF NOT EXISTS idx_sensor_readings_embedding
          ON sensor_readings
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);
        """
    ),
    (
        "Realtime: sensor_readings",
        "ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;"
    ),
    (
        "Realtime: anomaly_events",
        "ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_events;"
    ),
    (
        "RPC: match_similar_anomalies",
        """
        CREATE OR REPLACE FUNCTION match_similar_anomalies(
          query_embedding vector(64),
          match_count int DEFAULT 5
        )
        RETURNS TABLE (
          id uuid,
          device_id text,
          "timestamp" timestamptz,
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
            sr."timestamp",
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
        """
    ),
]

# Seed data
SEEDS = [
    (
        "Seed: devices",
        """
        INSERT INTO devices (id, name, location, sensor_count, status, current_rul, metadata) VALUES
          ('DEVICE-001', 'Turbin A1', 'Makine Dairesi - Kat 1', 10, 'active', 185.5, '{"type": "steam_turbine", "capacity_mw": 150}'),
          ('DEVICE-002', 'Turbin A2', 'Makine Dairesi - Kat 1', 10, 'active', 92.3, '{"type": "steam_turbine", "capacity_mw": 150}'),
          ('DEVICE-003', 'Pompa B1', 'Su Aritma Unitesi', 10, 'active', 210.0, '{"type": "feed_pump", "capacity_lph": 5000}'),
          ('DEVICE-004', 'Kompresor C1', 'Hava Kompresor Odasi', 10, 'warning', 45.2, '{"type": "air_compressor", "pressure_bar": 12}'),
          ('DEVICE-005', 'Jenerator D1', 'Jenerator Binasi', 10, 'active', 156.8, '{"type": "generator", "capacity_mw": 200}')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          current_rul = EXCLUDED.current_rul,
          metadata = EXCLUDED.metadata;
        """
    ),
    (
        "Seed: model_metrics",
        """
        INSERT INTO model_metrics (model_name, version, accuracy, precision_score, recall_score, f1_score, auc_roc, rul_rmse, dataset_size, hyperparams) VALUES
          ('isolation_forest', 'v1.0.0', 0.94, 0.89, 0.91, 0.90, 0.95, NULL, 20000,
           '{"n_estimators": 100, "contamination": 0.05, "random_state": 42}'),
          ('lstm_autoencoder', 'v1.0.0', 0.92, 0.87, 0.93, 0.90, 0.94, NULL, 20000,
           '{"hidden_size": 64, "epochs": 50, "batch_size": 32, "learning_rate": 0.001}'),
          ('rul_predictor', 'v1.0.0', NULL, NULL, NULL, NULL, NULL, 23.5, 20000,
           '{"model": "GradientBoostingRegressor", "n_estimators": 200, "max_depth": 5}');
        """
    ),
]


def main():
    print("=" * 60)
    print("SCADA Anomali Dashboard - Supabase Migrations")
    print("=" * 60)

    success = 0
    failed = 0

    print("\n--- Migrations ---")
    for label, sql in MIGRATIONS:
        if execute_sql(sql, label):
            success += 1
        else:
            failed += 1

    print("\n--- Seed Data ---")
    for label, sql in SEEDS:
        if execute_sql(sql, label):
            success += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"Tamamlandi: {success} basarili, {failed} basarisiz")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
