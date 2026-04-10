"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AnomalyEvent } from "@/lib/database.types";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  low: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

const DEVICE_NAMES: Record<string, string> = {
  "DEVICE-001": "Turbin A1",
  "DEVICE-002": "Turbin A2",
  "DEVICE-003": "Pompa B1",
  "DEVICE-004": "Kompresor C1",
  "DEVICE-005": "Jenerator D1",
};

const SENSOR_LABELS: Record<string, string> = {
  sensor_2: "Fan giriş sıcaklığı",
  sensor_3: "LPC çıkış sıcaklığı",
  sensor_4: "HPC çıkış sıcaklığı",
  sensor_7: "Toplam sıcaklık (LPT)",
  sensor_8: "Fiziksel fan hızı",
  sensor_9: "Fiziksel çekirdek hızı",
  sensor_11: "Statik basınç (HPC)",
  sensor_12: "Yakıt/hava oranı",
  sensor_13: "Düzeltilmiş fan hızı",
  sensor_14: "Düzeltilmiş çekirdek hızı",
  sensor_15: "Bypass oranı",
  sensor_17: "Bleed entalpisi",
  sensor_20: "HPT soğutucu bleed",
  sensor_21: "LPT soğutucu bleed",
};

interface Props {
  onRowClick?: (id: string) => void;
  refreshKey?: number;
}

export function AnomalyTable({ onRowClick, refreshKey = 0 }: Props) {
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/anomalies`)
      .then((r) => r.json())
      .then((res) => {
        setEvents((res.data ?? []).slice(0, 10));
        setTotal(res.total ?? 0);
      })
      .catch(() => {});
  }, [refreshKey]);

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="font-semibold text-sm">Anomali Olayları</h3>
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {total} kayıt
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Anomali olayı bulunamadı
        </div>
      ) : (
        <div>
          {/* Tablo basliklari */}
          <div className="grid grid-cols-[1fr_1.5fr_auto] gap-4 px-5 py-2.5 border-b border-border/40 bg-muted/20">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cihaz</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uyarı</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tarih</span>
          </div>

          {/* Satirlar */}
          <div className="divide-y divide-border/30">
            {events.map((event) => {
              const deviceName = DEVICE_NAMES[event.device_id] ?? event.device_id;
              const topSensor = event.shap_top_feature;
              const sensorLabel = topSensor ? (SENSOR_LABELS[topSensor] ?? topSensor) : null;

              return (
                <div
                  key={event.id}
                  className="grid grid-cols-[1fr_1.5fr_auto] gap-4 px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors items-center"
                  onClick={() => onRowClick?.(event.id)}
                >
                  {/* 1. Sutun: Cihaz */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", {
                      "bg-red-500": event.severity === "critical",
                      "bg-orange-500": event.severity === "high",
                      "bg-yellow-500": event.severity === "medium",
                      "bg-green-500": event.severity === "low",
                    })} />
                    <span className="text-sm font-semibold truncate">{deviceName}</span>
                  </div>

                  {/* 2. Sutun: Uyari (severity + sensor) */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0", SEVERITY_STYLES[event.severity])}>
                      {SEVERITY_LABEL[event.severity] ?? event.severity}
                    </span>
                    {sensorLabel ? (
                      <span className="text-[12px] text-foreground/80 truncate">
                        {sensorLabel}
                        <span className="text-muted-foreground text-[10px] ml-1">({topSensor})</span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-foreground/60 truncate">
                        Ensemble tespit
                      </span>
                    )}
                  </div>

                  {/* 3. Sutun: Tarih */}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(event.detected_at).toLocaleString("tr", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
