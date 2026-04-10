"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface SimilarAnomaly {
  id: string;
  device_id: string;
  timestamp: string;
  anomaly_score: number | null;
  rul_estimate: number | null;
  similarity: number;
}

interface Props {
  anomalyId?: string;
  anomalies?: SimilarAnomaly[];
}

export function SimilarAnomalies({ anomalyId, anomalies: propAnomalies }: Props) {
  const [fetched, setFetched] = useState<SimilarAnomaly[]>([]);

  useEffect(() => {
    if (!anomalyId || propAnomalies) return;
    fetch(`/api/similar-anomalies?anomaly_id=${anomalyId}`)
      .then((r) => r.json())
      .then((res) => setFetched(res.data ?? []))
      .catch(() => {});
  }, [anomalyId, propAnomalies]);

  const anomalies = propAnomalies ?? fetched;

  if (!anomalyId && anomalies.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm border">
        <h3 className="font-semibold text-sm mb-3">Benzer Anomaliler</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Bir anomali secin</p>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm border">
        <h3 className="font-semibold text-sm mb-3">Benzer Anomaliler</h3>
        <p className="text-sm text-muted-foreground">Embedding verisi gerekli</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <h3 className="font-semibold text-sm mb-3">Benzer Anomaliler (pgvector)</h3>
      <div className="space-y-2">
        {anomalies.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
            <div>
              <span className="font-medium">{a.device_id}</span>
              <span className="text-muted-foreground ml-2">
                {new Date(a.timestamp).toLocaleDateString("tr")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {a.rul_estimate && (
                <span className="text-muted-foreground">RUL: {Math.round(a.rul_estimate)}</span>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {(a.similarity * 100).toFixed(0)}% benzer
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
