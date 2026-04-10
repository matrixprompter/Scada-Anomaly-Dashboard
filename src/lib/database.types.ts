export interface SensorReading {
  id: string;
  device_id: string;
  timestamp: string;
  sensor_data: Record<string, number>;
  embedding?: number[];
  is_anomaly: boolean;
  anomaly_score: number | null;
  rul_estimate: number | null;
  shap_values: Record<string, number> | null;
  created_at: string;
}

export interface AnomalyEvent {
  id: string;
  device_id: string;
  detected_at: string;
  severity: "low" | "medium" | "high" | "critical";
  sensor_values: Record<string, number> | null;
  shap_top_feature: string | null;
  model_version: string | null;
  resolved_at: string | null;
  notes: string | null;
}

export interface ModelMetric {
  id: string;
  model_name: string;
  version: string;
  trained_at: string;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  auc_roc: number | null;
  rul_rmse: number | null;
  dataset_size: number | null;
  hyperparams: Record<string, unknown> | null;
}

export interface Device {
  id: string;
  name: string;
  location: string | null;
  sensor_count: number;
  status: string;
  last_seen: string;
  current_rul: number | null;
  metadata: Record<string, unknown>;
}

export interface Database {
  public: {
    Tables: {
      sensor_readings: {
        Row: SensorReading;
        Insert: Omit<SensorReading, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SensorReading>;
      };
      anomaly_events: {
        Row: AnomalyEvent;
        Insert: Omit<AnomalyEvent, "id" | "detected_at"> & {
          id?: string;
          detected_at?: string;
        };
        Update: Partial<AnomalyEvent>;
      };
      model_metrics: {
        Row: ModelMetric;
        Insert: Omit<ModelMetric, "id" | "trained_at"> & {
          id?: string;
          trained_at?: string;
        };
        Update: Partial<ModelMetric>;
      };
      devices: {
        Row: Device;
        Insert: Omit<Device, "last_seen"> & { last_seen?: string };
        Update: Partial<Device>;
      };
    };
  };
}
