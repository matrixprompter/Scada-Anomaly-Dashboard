"use client";

import { cn } from "@/lib/utils";

interface Props {
  deviceId: string;
  deviceName: string;
  rul: number | null | undefined;
  hasAnomaly?: boolean;
}

function getRulStatus(rul: number | null | undefined, hasAnomaly: boolean): { label: string; color: string; strokeColor: string; textColor: string; message: string } {
  if (hasAnomaly) {
    // Anomali varsa RUL'a bakmaksızın uyarı göster
    if (rul !== null && rul !== undefined && !isNaN(rul)) {
      if (rul < 50) {
        return { label: "Kritik", color: "text-red-500", strokeColor: "#ef4444", textColor: "text-red-600 dark:text-red-400", message: "Acil bakım gerekli" };
      }
      if (rul <= 150) {
        return { label: "Dikkat", color: "text-amber-500", strokeColor: "#f59e0b", textColor: "text-amber-600 dark:text-amber-400", message: "Bakım planlanmalı" };
      }
      // RUL yüksek ama anomali var
      return { label: "Anomali", color: "text-orange-500", strokeColor: "#f97316", textColor: "text-orange-600 dark:text-orange-400", message: "Anomali tespit edildi — kontrol gerekli" };
    }
    return { label: "Anomali", color: "text-orange-500", strokeColor: "#f97316", textColor: "text-orange-600 dark:text-orange-400", message: "Anomali tespit edildi" };
  }

  if (rul === null || rul === undefined || isNaN(rul)) {
    return { label: "Aktif", color: "text-green-500", strokeColor: "#22c55e", textColor: "text-green-600 dark:text-green-400", message: "Veri bekleniyor" };
  }
  if (rul > 150) {
    return { label: "Sağlıklı", color: "text-green-500", strokeColor: "#22c55e", textColor: "text-green-600 dark:text-green-400", message: "Bakım gerekmiyor" };
  }
  if (rul > 50) {
    return { label: "Dikkat", color: "text-amber-500", strokeColor: "#f59e0b", textColor: "text-amber-600 dark:text-amber-400", message: "Bakım planlanmalı" };
  }
  return { label: "Kritik", color: "text-red-500", strokeColor: "#ef4444", textColor: "text-red-600 dark:text-red-400", message: "Acil bakım gerekli" };
}

export function RULGauge({ deviceId, deviceName, rul, hasAnomaly = false }: Props) {
  const value = typeof rul === "number" && !isNaN(rul) ? rul : 0;
  const maxRul = 300;
  const pct = Math.min((value / maxRul) * 100, 100);
  const rulStatus = getRulStatus(rul, hasAnomaly);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const offset = arcLength - (pct / 100) * arcLength;

  return (
    <div className={cn(
      "rounded-2xl bg-card/80 backdrop-blur-sm p-4 border-2 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center",
      hasAnomaly
        ? "border-orange-400/70 dark:border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10"
        : rulStatus.label === "Dikkat"
          ? "border-amber-300/60 dark:border-amber-700/40"
          : rulStatus.label === "Kritik"
            ? "border-red-300/60 dark:border-red-700/40"
            : "border-transparent",
    )}>
      <p className="text-[11px] font-semibold tracking-wide mb-1">
        {deviceName}
      </p>

      {/* Status + anomaly badges */}
      <div className="flex items-center gap-1 mb-2">
        <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", {
          "bg-green-500/10 text-green-600 dark:text-green-400": rulStatus.label === "Sağlıklı" || rulStatus.label === "Aktif",
          "bg-amber-500/10 text-amber-600 dark:text-amber-400": rulStatus.label === "Dikkat",
          "bg-red-500/10 text-red-600 dark:text-red-400": rulStatus.label === "Kritik",
          "bg-orange-500/10 text-orange-600 dark:text-orange-400": rulStatus.label === "Anomali",
        })}>
          {rulStatus.label}
        </span>
        {hasAnomaly && rulStatus.label !== "Anomali" && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400">
            Anomali
          </span>
        )}
      </div>

      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-muted/40"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            strokeWidth="6"
            stroke={rulStatus.strokeColor}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-bold", rulStatus.color)}>
            {typeof rul === "number" && !isNaN(rul) ? Math.round(rul) : "—"}
          </span>
          <span className="text-[8px] text-muted-foreground font-medium">döngü</span>
        </div>
      </div>

      {/* Alt bilgi */}
      <div className="text-center mt-1">
        <p className="text-[9px] text-muted-foreground">
          Kalan çalışma döngüsü (RUL)
        </p>
        <p className={cn("text-[10px] font-medium mt-0.5", rulStatus.textColor)}>
          {rulStatus.message}
        </p>
      </div>
    </div>
  );
}
