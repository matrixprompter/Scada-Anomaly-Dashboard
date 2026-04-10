-- Ornek model metrikleri (FAZ 2'de gercek degerlerle guncellenecek)
INSERT INTO model_metrics (model_name, version, accuracy, precision_score, recall_score, f1_score, auc_roc, rul_rmse, dataset_size, hyperparams) VALUES
  ('isolation_forest', 'v1.0.0', 0.94, 0.89, 0.91, 0.90, 0.95, NULL, 20000,
   '{"n_estimators": 100, "contamination": 0.05, "random_state": 42}'),
  ('lstm_autoencoder', 'v1.0.0', 0.92, 0.87, 0.93, 0.90, 0.94, NULL, 20000,
   '{"hidden_size": 64, "epochs": 50, "batch_size": 32, "learning_rate": 0.001}'),
  ('rul_predictor', 'v1.0.0', NULL, NULL, NULL, NULL, NULL, 23.5, 20000,
   '{"model": "GradientBoostingRegressor", "n_estimators": 200, "max_depth": 5}');
