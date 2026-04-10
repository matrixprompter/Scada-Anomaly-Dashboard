"use client";

import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import "@/lib/chartjs-setup";
import { useRealtimeSensors } from "@/hooks/useRealtimeSensors";
import { cn } from "@/lib/utils";

const SENSOR_LABELS: Record<string, string> = {
  sensor_2: "Fan Giriş Sıcaklığı",
  sensor_3: "LPC Çıkış Sıcaklığı",
  sensor_4: "HPC Çıkış Sıcaklığı",
  sensor_7: "Toplam Sıcaklık (LPT)",
  sensor_8: "Fiziksel Fan Hızı",
  sensor_9: "Fiziksel Çekirdek Hızı",
  sensor_11: "Statik Basınç (HPC)",
  sensor_12: "Yakıt/Hava Oranı",
  sensor_13: "Düzeltilmiş Fan Hızı",
  sensor_14: "Düzeltilmiş Çekirdek Hızı",
  sensor_15: "Bypass Oranı",
  sensor_17: "Bleed Entalpisi",
  sensor_20: "HPT Soğutucu Bleed",
  sensor_21: "LPT Soğutucu Bleed",
};

const ALL_SENSORS = Object.keys(SENSOR_LABELS);

const PALETTE = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#84cc16", "#e11d48", "#0891b2", "#a855f7",
];

// Her sensore sabit renk ata — pill rengi = grafik cizgi rengi
const SENSOR_COLOR: Record<string, string> = {};
ALL_SENSORS.forEach((s, i) => {
  SENSOR_COLOR[s] = PALETTE[i % PALETTE.length];
});

interface Props {
  deviceId?: string;
}

export function RealtimeSensorChart({ deviceId }: Props) {
  const { readings, isConnected } = useRealtimeSensors({ deviceId, maxItems: 60 });
  const [selected, setSelected] = useState<Set<string>>(
    new Set(ALL_SENSORS.slice(0, 5))
  );

  const toggle = (sensor: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sensor)) {
        if (next.size > 1) next.delete(sensor);
      } else {
        next.add(sensor);
      }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const sorted = [...readings].reverse();
    const labels = sorted.map((r) => {
      const d = new Date(r.timestamp);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    });

    const activeSensors = ALL_SENSORS.filter((s) => selected.has(s));

    return {
      labels,
      datasets: activeSensors.map((name) => ({
        label: SENSOR_LABELS[name] ?? name,
        data: sorted.map((r) => {
          const sd = r.sensor_data as Record<string, number>;
          return sd[name] ?? 0;
        }),
        borderColor: SENSOR_COLOR[name],
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      })),
    };
  }, [readings, selected]);

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-5 border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Sensör Verisi</h3>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-[10px] text-muted-foreground">
            {isConnected ? "Canlı" : "Bağlantı yok"}
          </span>
        </div>
      </div>

      {/* Sensor secici */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ALL_SENSORS.map((sensor) => (
          <button
            key={sensor}
            onClick={() => toggle(sensor)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium",
              selected.has(sensor)
                ? "text-white border-transparent"
                : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
            )}
            style={selected.has(sensor) ? { backgroundColor: SENSOR_COLOR[sensor] } : undefined}
          >
            {SENSOR_LABELS[sensor]}
          </button>
        ))}
      </div>

      {readings.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
          Veri bekleniyor…
        </div>
      ) : (
        <div className="h-[240px]">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 300 },
              scales: {
                x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } },
                y: { beginAtZero: false, grid: { color: "rgba(0,0,0,0.04)" } },
              },
              plugins: { legend: { position: "top", labels: { boxWidth: 8, font: { size: 10 }, usePointStyle: true, pointStyle: "circle" } } },
            }}
          />
        </div>
      )}
    </div>
  );
}
