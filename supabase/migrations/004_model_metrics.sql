-- P1-104: model_metrics tablosu
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
