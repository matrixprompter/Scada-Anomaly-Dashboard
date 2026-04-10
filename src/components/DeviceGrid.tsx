"use client";

import { useEffect, useState } from "react";
import { Server, Clock, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Device } from "@/lib/database.types";

function getRulInfo(rul: number | null, hasAnomaly: boolean): { color: string; label: string; urgency: string } {
  if (hasAnomaly) {
    if (rul !== null && rul < 50) return { color: "text-red-600 dark:text-red-400", label: "Kritik", urgency: "Acil bakım gerekli" };
    if (rul !== null && rul <= 150) return { color: "text-amber-600 dark:text-amber-400", label: "Dikkat", urgency: "Bakım planlanmalı" };
    return { color: "text-orange-600 dark:text-orange-400", label: "Anomali", urgency: "Anomali tespit edildi — kontrol gerekli" };
  }
  if (rul === null) return { color: "text-green-600 dark:text-green-400", label: "Aktif", urgency: "Veri bekleniyor" };
  if (rul > 150) return { color: "text-green-600 dark:text-green-400", label: "Sağlıklı", urgency: "Bakım gerekmiyor" };
  if (rul > 50) return { color: "text-amber-600 dark:text-amber-400", label: "Dikkat", urgency: "Bakım planlanmalı" };
  return { color: "text-red-600 dark:text-red-400", label: "Kritik", urgency: "Acil bakım gerekli" };
}

function getStatusInfo(rul: number | null, hasAnomaly: boolean) {
  const rulInfo = getRulInfo(rul, hasAnomaly);

  if (hasAnomaly) {
    return {
      dot: rul !== null && rul < 50 ? "bg-red-500" : "bg-orange-500",
      label: rulInfo.label,
      icon: AlertTriangle,
      iconColor: rul !== null && rul < 50 ? "text-red-500" : "text-orange-500",
      reason: rul !== null
        ? `RUL: ${Math.round(rul)} döngü — ${rulInfo.urgency}`
        : rulInfo.urgency,
      borderClass: "border-orange-400/70 dark:border-orange-500/50",
    };
  }

  if (rul !== null && rul < 50) {
    return {
      dot: "bg-red-500",
      label: "Kritik",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      reason: `RUL çok düşük (${Math.round(rul)}) — ${rulInfo.urgency}`,
      borderClass: "border-red-300/50 dark:border-red-700/30",
    };
  }
  if (rul !== null && rul <= 150) {
    return {
      dot: "bg-amber-500",
      label: "Dikkat",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      reason: `RUL orta seviye (${Math.round(rul)}) — ${rulInfo.urgency}`,
      borderClass: "border-amber-300/50 dark:border-amber-700/30",
    };
  }
  return {
    dot: "bg-green-500",
    label: "Aktif",
    icon: CheckCircle,
    iconColor: "text-green-500",
    reason: rul !== null ? `RUL: ${Math.round(rul)} döngü — ${rulInfo.urgency}` : "Normal çalışma durumunda",
    borderClass: "",
  };
}

interface DeviceGridProps {
  refreshKey?: number;
  anomalyDeviceIds?: Set<string>;
}

export function DeviceGrid({ refreshKey = 0, anomalyDeviceIds = new Set() }: DeviceGridProps) {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((res) => setDevices(res.data ?? []))
      .catch(() => {});
  }, [refreshKey]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {devices.map((device) => {
        const deviceHasAnomaly = anomalyDeviceIds.has(device.id);
        const info = getStatusInfo(device.current_rul, deviceHasAnomaly);
        const StatusIcon = info.icon;
        const rulInfo = getRulInfo(device.current_rul, deviceHasAnomaly);

        return (
          <div
            key={device.id}
            className={cn(
              "rounded-2xl bg-card/80 backdrop-blur-sm p-4 border-2 shadow-sm hover:shadow-md transition-all duration-200",
              deviceHasAnomaly
                ? "border-orange-400/70 dark:border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10"
                : info.borderClass || "border-transparent",
            )}
          >
            {/* Üst: isim + durum */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center",
                  deviceHasAnomaly ? "bg-orange-100 dark:bg-orange-900/30" : "bg-muted/60",
                )}>
                  <Server className={cn("h-4 w-4", deviceHasAnomaly ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")} />
                </div>
                <div>
                  <span className="font-semibold text-sm block">{device.name}</span>
                  <span className="text-[10px] text-muted-foreground">{device.location}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <StatusIcon className={cn("h-3.5 w-3.5", info.iconColor)} />
                  <span className="text-[10px] font-semibold text-muted-foreground">{info.label}</span>
                </div>
                {deviceHasAnomaly && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400">
                    Anomali tespit edildi
                  </span>
                )}
              </div>
            </div>

            {/* Orta: RUL + sensör */}
            <div className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                {device.sensor_count} sensör
              </span>
              <div className="text-right">
                <span className={cn("font-bold text-sm", rulInfo.color)}>
                  RUL: {device.current_rul !== null ? Math.round(device.current_rul) : "—"}
                </span>
              </div>
            </div>

            {/* Alt: durum açıklaması */}
            <div className="mt-2.5 pt-2.5 border-t border-border/30">
              <p className={cn("text-[11px] font-medium", info.iconColor)}>
                {info.reason}
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Son görülen: {device.last_seen ? new Date(device.last_seen).toLocaleString("tr", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                }) : "Bilinmiyor"}
              </div>
            </div>
          </div>
        );
      })}
      {devices.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground text-sm py-8">
          Cihaz bulunamadı
        </div>
      )}
    </div>
  );
}
