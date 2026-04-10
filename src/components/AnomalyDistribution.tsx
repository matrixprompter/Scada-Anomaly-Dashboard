"use client";

import { useEffect, useState } from "react";
import { Scatter } from "react-chartjs-2";
import "@/lib/chartjs-setup";

interface AnomalyPoint {
  id: string;
  detected_at: string;
  severity: string;
  device_id: string;
  shap_top_feature: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

interface Props {
  onPointClick?: (id: string) => void;
  refreshKey?: number;
}

export function AnomalyDistribution({ onPointClick, refreshKey = 0 }: Props) {
  const [data, setData] = useState<AnomalyPoint[]>([]);

  useEffect(() => {
    fetch("/api/anomalies?limit=200")
      .then((r) => r.json())
      .then((res) => setData(res.data ?? []))
      .catch(() => {});
  }, [refreshKey]);

  const chartData = {
    datasets: Object.entries(SEVERITY_COLORS).map(([severity, color]) => ({
      label: severity,
      data: data
        .filter((d) => d.severity === severity)
        .map((d, idx) => ({
          x: new Date(d.detected_at).getTime(),
          y: (severity === "critical" ? 0.9 : severity === "high" ? 0.7 : severity === "medium" ? 0.45 : 0.2) + ((idx % 7) * 0.04 - 0.14),
        })),
      backgroundColor: color + "cc",
      pointRadius: 4,
      pointHoverRadius: 7,
    })),
  };

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-5 border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-4">Anomali Dağılımı</h3>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Anomali verisi bekleniyor…
        </div>
      ) : (
        <div className="flex-1 min-h-[240px]">
          <Scatter
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { type: "linear", grid: { display: false }, ticks: { callback: (v) => new Date(v as number).toLocaleDateString("tr"), font: { size: 10 } } },
                y: { title: { display: true, text: "Skor", font: { size: 10 } }, min: 0, max: 1, grid: { color: "rgba(0,0,0,0.04)" } },
              },
              plugins: { legend: { position: "top", labels: { boxWidth: 8, font: { size: 10 }, usePointStyle: true, pointStyle: "circle" } } },
              onClick: (_e, elements) => {
                if (elements.length > 0 && onPointClick) {
                  const idx = elements[0].index;
                  const dsIdx = elements[0].datasetIndex;
                  const severity = Object.keys(SEVERITY_COLORS)[dsIdx];
                  const filtered = data.filter((d) => d.severity === severity);
                  if (filtered[idx]) onPointClick(filtered[idx].id);
                }
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
