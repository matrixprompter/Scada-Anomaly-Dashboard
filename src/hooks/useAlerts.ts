"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AnomalyEvent } from "@/lib/database.types";

export interface Alert extends AnomalyEvent {
  read: boolean;
}

const STORAGE_KEY = "scada_read_alerts";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function useAlerts(maxAlerts = 20) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sayfa yuklenince mevcut anomalileri cek
  useEffect(() => {
    fetch("/api/anomalies")
      .then((r) => r.json())
      .then((res) => {
        const events: AnomalyEvent[] = (res.data ?? []).slice(0, maxAlerts);
        const readIds = getReadIds();
        const loaded: Alert[] = events.map((e) => ({
          ...e,
          read: readIds.has(e.id),
        }));
        setAlerts(loaded);
        setUnreadCount(loaded.filter((a) => !a.read).length);
      })
      .catch(() => {});
  }, [maxAlerts]);

  const handleNewAnomaly = useCallback(
    (payload: { new: AnomalyEvent }) => {
      const event = payload.new;
      const alert: Alert = { ...event, read: false };

      setAlerts((prev) => {
        const exists = prev.some((a) => a.id === event.id);
        if (exists) return prev;
        return [alert, ...prev].slice(0, maxAlerts);
      });
      setUnreadCount((prev) => prev + 1);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        (event.severity === "critical" || event.severity === "high")
      ) {
        new Notification(`SCADA Alarm: ${event.severity.toUpperCase()}`, {
          body: `Cihaz: ${event.device_id} | Sensor: ${event.shap_top_feature || "N/A"}`,
          icon: "/favicon.ico",
        });
      }
    },
    [maxAlerts]
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("anomaly_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anomaly_events",
        },
        handleNewAnomaly as any
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [handleNewAnomaly]);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => {
      const readIds = getReadIds();
      prev.forEach((a) => readIds.add(a.id));
      saveReadIds(readIds);
      return prev.map((a) => ({ ...a, read: true }));
    });
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => {
      const readIds = getReadIds();
      readIds.add(id);
      saveReadIds(readIds);
      return prev.map((a) => (a.id === id ? { ...a, read: true } : a));
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Listen for reset event (fired by SensorControl "Durdur")
  useEffect(() => {
    const handleReset = () => {
      setAlerts([]);
      setUnreadCount(0);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };
    window.addEventListener("scada-alerts-reset", handleReset);
    return () => window.removeEventListener("scada-alerts-reset", handleReset);
  }, []);

  return { alerts, unreadCount, markAllRead, markRead };
}
