"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { KPICard } from "@/components/KPICard";
import { RULGauge } from "@/components/RULGauge";
import { RealtimeSensorChart } from "@/components/RealtimeSensorChart";
import { AnomalyDistribution } from "@/components/AnomalyDistribution";
import { AnomalyTrend } from "@/components/AnomalyTrend";
import { AnomalyTable } from "@/components/AnomalyTable";
import { DeviceGrid } from "@/components/DeviceGrid";

const POLL_INTERVAL = 10_000; // 10 saniye

interface Device {
  id: string;
  name: string;
  status: string;
  current_rul: number | null;
}

interface KPI {
  totalAnomalies: number;
  activeDevices: number;
  avgScore: number;
  last24h: number;
  avgRul: number;
  criticalDevices: number;
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [anomalyDeviceIds, setAnomalyDeviceIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((res) => {
        const devs: Device[] = res.data ?? [];
        setDevices(devs);

        const active = devs.filter((d) => d.status !== "offline").length;
        const ruls = devs
          .map((d) => d.current_rul)
          .filter((r): r is number => r !== null);
        const avgRul = ruls.length
          ? Math.round(ruls.reduce((a, b) => a + b, 0) / ruls.length)
          : 0;
        setKpi((prev) => ({
          totalAnomalies: prev?.totalAnomalies ?? 0,
          activeDevices: active,
          avgScore: prev?.avgScore ?? 0,
          last24h: prev?.last24h ?? 0,
          avgRul: avgRul,
          criticalDevices: prev?.criticalDevices ?? 0,
        }));
      })
      .catch(() => {});

    fetch("/api/anomalies")
      .then((r) => r.json())
      .then((res) => {
        const events = res.data ?? [];
        const total = res.total ?? events.length;

        // Anomali olan cihaz ID'lerini topla
        const devIds = new Set<string>();
        for (const e of events) {
          if (e.device_id) devIds.add(e.device_id);
        }
        setAnomalyDeviceIds(devIds);

        setKpi((prev) => ({
          totalAnomalies: total,
          activeDevices: prev?.activeDevices ?? 0,
          avgScore: prev?.avgScore ?? 0,
          last24h: total,
          avgRul: prev?.avgRul ?? 0,
          criticalDevices: devIds.size,
        }));
      })
      .catch(() => {});

    fetch("/api/sensors?limit=100")
      .then((r) => r.json())
      .then((res) => {
        const readings = res.data ?? [];
        const scores = readings
          .map((r: { anomaly_score: number | null }) => r.anomaly_score)
          .filter((s: number | null): s is number => s !== null && !isNaN(s));
        const avgScore = scores.length
          ? +(scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2)
          : 0;
        setKpi((prev) => ({
          totalAnomalies: prev?.totalAnomalies ?? 0,
          activeDevices: prev?.activeDevices ?? 0,
          avgScore,
          last24h: prev?.last24h ?? 0,
          avgRul: prev?.avgRul ?? 0,
          criticalDevices: prev?.criticalDevices ?? 0,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setRefreshKey((k) => k + 1);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Section: KPI */}
      <section id="onboard-kpi">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Genel Bakış
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard title="Toplam Anomali" value={kpi?.totalAnomalies ?? "—"} />
          <KPICard title="Aktif Cihaz" value={kpi?.activeDevices ?? "—"} subtitle={`/ ${devices.length} toplam`} />
          <KPICard
            title="Ort. Anomali Skoru"
            value={kpi?.avgScore ?? "—"}
          />
          <KPICard
            title="Son 24s Alarm"
            value={kpi?.last24h ?? "—"}
            variant={kpi && kpi.last24h > 10 ? "danger" : "default"}
          />
          <KPICard title="Ortalama RUL" value={kpi?.avgRul ?? "—"} />
          <KPICard
            title="Kritik Cihaz"
            value={kpi?.criticalDevices ?? "—"}
            variant={kpi && kpi.criticalDevices > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {/* Section: Cihaz RUL */}
      {devices.length > 0 && (
        <section id="onboard-rul">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Cihaz Sağlık Durumu (RUL)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {devices.map((d) => (
              <RULGauge
                key={d.id}
                deviceId={d.id}
                deviceName={d.name}
                rul={d.current_rul}
                hasAnomaly={anomalyDeviceIds.has(d.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section: Charts */}
      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Sensör & Anomali Analizi
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div id="onboard-sensor-chart" className="h-full"><RealtimeSensorChart /></div>
          <div id="onboard-anomaly-dist" className="h-full"><AnomalyDistribution refreshKey={refreshKey} /></div>
        </div>
      </section>

      {/* Section: Trend */}
      <section id="onboard-trend">
        <div className="grid grid-cols-1 gap-4">
          <AnomalyTrend refreshKey={refreshKey} />
        </div>
      </section>

      {/* Section: Recent Anomalies */}
      <section id="onboard-anomaly-table">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Son Anomali Olayları
        </h2>
        <AnomalyTable refreshKey={refreshKey} />
      </section>

      {/* Section: Devices */}
      <section id="onboard-devices">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Cihazlar
        </h2>
        <DeviceGrid refreshKey={refreshKey} anomalyDeviceIds={anomalyDeviceIds} />
      </section>
    </div>
  );
}
