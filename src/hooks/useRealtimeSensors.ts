"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { SensorReading } from "@/lib/database.types";

interface UseRealtimeSensorsOptions {
  deviceId?: string;
  maxItems?: number;
}

export function useRealtimeSensors({
  deviceId,
  maxItems = 60,
}: UseRealtimeSensorsOptions = {}) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleInsert = useCallback(
    (payload: { new: SensorReading }) => {
      const newReading = payload.new;
      if (deviceId && newReading.device_id !== deviceId) return;

      setLatestReading(newReading);
      setReadings((prev) => {
        const updated = [newReading, ...prev];
        return updated.slice(0, maxItems);
      });
    },
    [deviceId, maxItems]
  );

  // Initial fetch + polling fallback
  useEffect(() => {
    const fetchInitial = () => {
      let url = `/api/sensors?limit=${maxItems}`;
      if (deviceId) url += `&device_id=${deviceId}`;
      fetch(url)
        .then((r) => r.json())
        .then((res) => {
          const data = res.data ?? [];
          if (data.length > 0) {
            setReadings(data);
            setLatestReading(data[0]);
            setIsConnected(true);
          }
        })
        .catch(() => {});
    };

    fetchInitial();
    const pollInterval = setInterval(fetchInitial, 10_000);

    // Supabase realtime subscription
    const channel = supabase
      .channel("sensor_readings_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
        },
        handleInsert as any
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [handleInsert, deviceId, maxItems]);

  return { readings, latestReading, isConnected };
}
