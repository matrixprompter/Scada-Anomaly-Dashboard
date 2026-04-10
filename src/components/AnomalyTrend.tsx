"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "@/lib/chartjs-setup";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendDay {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Props {
  refreshKey?: number;
}

export function AnomalyTrend({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<TrendDay[]>([]);
  const [changePct, setChangePct] = useState(0);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetch(`/api/trend?days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data ?? []);
        setChangePct(res.change_pct ?? 0);
      })
      .catch(() => {});
  }, [days, refreshKey]);

  const chartData = {
    labels: data.map((d) => d.date.slice(5)),
    datasets: [
      { label: "Critical", data: data.map((d) => d.critical), backgroundColor: "#ef444499", borderRadius: 4, stack: "stack" },
      { label: "High", data: data.map((d) => d.high), backgroundColor: "#f9731699", borderRadius: 4, stack: "stack" },
      { label: "Medium", data: data.map((d) => d.medium), backgroundColor: "#eab30899", borderRadius: 4, stack: "stack" },
    ],
  };

  const TrendIcon = changePct > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-5 border shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Anomali Trendi</h3>
          {changePct !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${changePct > 0 ? "text-red-500" : "text-green-500"}`}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(changePct)}%
            </span>
          )}
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                days === d
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          Trend verisi bekleniyor…
        </div>
      ) : (
        <div className="h-[220px]">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { stacked: true, beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" } },
              },
              plugins: { legend: { position: "top", labels: { boxWidth: 8, font: { size: 10 }, usePointStyle: true, pointStyle: "circle" } } },
            }}
          />
        </div>
      )}
    </div>
  );
}
