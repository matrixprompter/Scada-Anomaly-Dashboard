"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "@/lib/chartjs-setup";

interface PeriodStats {
  period: string;
  total: number;
  by_severity: { critical: number; high: number; medium: number; low: number };
  top_sensor: string | null;
}

interface PeriodData {
  period_a: PeriodStats;
  period_b: PeriodStats;
  diff: { anomaly_count: number };
}

const PERIOD_LABELS: Record<string, string> = {
  this_week: "Bu Hafta",
  last_week: "Gecen Hafta",
  this_month: "Bu Ay",
  last_month: "Gecen Ay",
};

export function PeriodComparison() {
  const [data, setData] = useState<PeriodData | null>(null);

  useEffect(() => {
    fetch("/api/period-compare")
      .then((r) => r.json())
      .then((res) => {
        if (res.period_a && res.period_b) setData(res);
      })
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-sm border">
        <h3 className="font-semibold text-sm mb-3">Donem Karsilastirmasi</h3>
        <div className="flex items-center justify-center h-[220px]">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const { period_a, period_b, diff } = data;
  const labelA = PERIOD_LABELS[period_a.period] ?? period_a.period;
  const labelB = PERIOD_LABELS[period_b.period] ?? period_b.period;
  const categories = ["critical", "high", "medium"] as const;
  const changePct = period_b.total > 0
    ? Math.round(((period_a.total - period_b.total) / period_b.total) * 100)
    : 0;

  const chartData = {
    labels: categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
    datasets: [
      {
        label: labelA,
        data: categories.map((c) => period_a.by_severity[c]),
        backgroundColor: "#6366f1",
        borderRadius: 4,
      },
      {
        label: labelB,
        data: categories.map((c) => period_b.by_severity[c]),
        backgroundColor: "#a5b4fc",
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Donem Karsilastirmasi</h3>
          {changePct !== 0 && (
            <span
              className={`text-xs font-medium ${changePct > 0 ? "text-red-500" : "text-green-500"}`}
            >
              {changePct > 0 ? "+" : ""}
              {changePct}%
            </span>
          )}
        </div>
      </div>
      <div className="h-[220px]">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { font: { size: 10 } } },
              y: { beginAtZero: true },
            },
            plugins: { legend: { position: "top", labels: { boxWidth: 8, font: { size: 10 } } } },
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <p className="text-muted-foreground">{labelA}</p>
          <p className="font-bold text-lg">{period_a.total}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <p className="text-muted-foreground">{labelB}</p>
          <p className="font-bold text-lg">{period_b.total}</p>
        </div>
      </div>
    </div>
  );
}
