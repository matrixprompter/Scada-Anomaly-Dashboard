"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Power, Loader2, Radio, Square, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "checking-server" | "server-ready" | "starting-ingest" | "ingesting" | "completed" | "stopping";

interface SensorControlProps {
  onStateChange?: (phase: Phase) => void;
}

export function SensorControl({ onStateChange }: SensorControlProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check current status on mount
  useEffect(() => {
    fetch("/api/script/status")
      .then((r) => r.json())
      .then((res) => {
        if (res.ingest) setPhase("ingesting");
        else if (res.mlServer) setPhase("server-ready");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    onStateChange?.(phase);
  }, [phase, onStateChange]);

  // Poll status while ingesting to detect when process finishes
  useEffect(() => {
    if (phase === "ingesting") {
      pollRef.current = setInterval(() => {
        fetch("/api/script/status")
          .then((r) => r.json())
          .then((res) => {
            if (!res.ingest) {
              setPhase("completed");
              if (pollRef.current) clearInterval(pollRef.current);
            }
          })
          .catch(() => {});
      }, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase]);

  const checkServer = useCallback(async () => {
    setPhase("checking-server");
    setError(null);
    try {
      const res = await fetch("/api/script/start-server", { method: "POST" });
      const data = await res.json();
      if (data.status === "already_running") {
        setPhase("server-ready");
      } else {
        setError(data.message || "ML API erisilemedi");
        setPhase("idle");
      }
    } catch {
      setError("ML API baglanti hatasi");
      setPhase("idle");
    }
  }, []);

  const startIngest = useCallback(async () => {
    setPhase("starting-ingest");
    setError(null);
    try {
      const res = await fetch("/api/script/start-ingest", { method: "POST" });
      const data = await res.json();
      if (data.status === "started" || data.status === "already_running") {
        setPhase("ingesting");
      } else {
        setError(data.message || "Veri aktarimi baslatilamadi");
        setPhase("server-ready");
      }
    } catch {
      setError("Veri aktarimi baglanti hatasi");
      setPhase("server-ready");
    }
  }, []);

  const stopAll = useCallback(async () => {
    setPhase("stopping");
    setError(null);
    try {
      await fetch("/api/script/stop", { method: "POST" });
      // Clear localStorage alert data
      try { localStorage.removeItem("scada_read_alerts"); } catch {}
      // Dispatch event so useAlerts resets
      window.dispatchEvent(new CustomEvent("scada-alerts-reset"));
      setPhase("idle");
    } catch {
      setError("Durdurma hatasi");
      setPhase("idle");
    }
  }, []);

  const handleMainAction = () => {
    if (phase === "idle") checkServer();
    else if (phase === "server-ready" || phase === "completed") startIngest();
  };

  const isLoading = phase === "checking-server" || phase === "starting-ingest" || phase === "stopping";

  const getMainButton = () => {
    switch (phase) {
      case "idle":
        return {
          label: "Sensörleri Aç",
          icon: <Power className="h-4 w-4" />,
          className: "bg-blue-600 hover:bg-blue-700 text-white",
          disabled: false,
        };
      case "checking-server":
        return {
          label: "Bağlanıyor…",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          className: "bg-blue-600/70 text-white",
          disabled: true,
        };
      case "server-ready":
        return {
          label: "Sensörlerden Veri Çek",
          icon: <Radio className="h-4 w-4" />,
          className: "bg-green-600 hover:bg-green-700 text-white",
          disabled: false,
        };
      case "starting-ingest":
        return {
          label: "Başlatılıyor…",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          className: "bg-green-600/70 text-white",
          disabled: true,
        };
      case "ingesting":
        return {
          label: "Veri Aktarılıyor…",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          className: "bg-green-600/80 text-white cursor-default",
          disabled: true,
        };
      case "completed":
        return {
          label: "Tamamlandı — Tekrar Çek",
          icon: <CheckCircle className="h-4 w-4" />,
          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
          disabled: false,
        };
      case "stopping":
        return {
          label: "Durduruluyor…",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          className: "bg-red-600/70 text-white",
          disabled: true,
        };
    }
  };

  const main = getMainButton();
  const showStop = phase === "server-ready" || phase === "ingesting" || phase === "completed";

  return (
    <div className="flex items-center gap-2">
      {/* Main action button */}
      <button
        onClick={handleMainAction}
        disabled={main.disabled || isLoading}
        className={cn(
          "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm",
          main.className,
          (main.disabled || isLoading) && "opacity-80 cursor-not-allowed"
        )}
      >
        {main.icon}
        {main.label}
      </button>

      {/* Stop button */}
      {showStop && (
        <button
          onClick={stopAll}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm",
            "bg-red-600 hover:bg-red-700 text-white",
            isLoading && "opacity-60 cursor-not-allowed"
          )}
        >
          <Square className="h-3.5 w-3.5" />
          Durdur
        </button>
      )}

      {/* Error message */}
      {error && (
        <span
          className="text-[10px] text-red-500 font-medium max-w-[350px] line-clamp-2 leading-tight"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
