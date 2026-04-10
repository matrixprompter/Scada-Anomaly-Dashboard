"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "@/lib/chartjs-setup";

interface Bin {
  range: string;
  count: number;
}

export function ConfidenceHistogram({ deviceId }: { deviceId?: string }) {
  const [bins, setBins] = useState<Bin[]>([]);

  useEffect(() => {
    const params = deviceId ? `?device_id=${deviceId}` : "";
    fetch(`/api/confidence-dist${params}`)
      .then((r) => r.json())
      .then((res) => setBins(res.bins ?? []))
      .catch(() => {});
  }, [deviceId]);

  const chartData = {
    labels: bins.map((b) => b.range),
    datasets: [
      {
        label: "Anomali Sayisi",
        data: bins.map((b) => b.count),
        backgroundColor: bins.map((_, i, arr) => {
          const ratio = i / (arr.length - 1 || 1);
          return ratio < 0.5 ? "#22c55e" : ratio < 0.75 ? "#eab308" : "#ef4444";
        }),
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <h3 className="font-semibold text-sm mb-3">Anomali Skor Dagilimi</h3>
      <div className="h-[220px]">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { font: { size: 9 } } },
              y: { beginAtZero: true },
            },
            plugins: { legend: { display: false } },
          }}
        />
      </div>
    </div>
  );
}
