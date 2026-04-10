"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "@/lib/chartjs-setup";

interface SHAPValue {
  feature: string;
  value: number;
}

export function SHAPExplainer({ anomalyId }: { anomalyId?: string }) {
  const [values, setValues] = useState<SHAPValue[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anomalyId) return;
    setLoading(true);
    fetch(`/api/shap-values?anomaly_id=${anomalyId}`)
      .then((r) => r.json())
      .then((res) => setValues(res.shap_values ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [anomalyId]);

  const sorted = [...values].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 10);

  const chartData = {
    labels: sorted.map((v) => v.feature.replace(/_/g, " ")),
    datasets: [
      {
        label: "SHAP Degeri",
        data: sorted.map((v) => v.value),
        backgroundColor: sorted.map((v) => (v.value > 0 ? "#ef4444" : "#3b82f6")),
        borderRadius: 4,
      },
    ],
  };

  if (!anomalyId) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm border">
        <h3 className="font-semibold text-sm mb-3">SHAP Aciklayicisi</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Bir anomali secin
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <h3 className="font-semibold text-sm mb-3">SHAP Aciklayicisi</h3>
      {loading ? (
        <div className="flex items-center justify-center h-[220px]">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-[220px]">
          <Bar
            data={chartData}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { ticks: { font: { size: 9 } } },
                y: { ticks: { font: { size: 9 } } },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-2">
        Kirmizi: anomaliye katkida bulunan, Mavi: normal yonde etkili
      </p>
    </div>
  );
}
