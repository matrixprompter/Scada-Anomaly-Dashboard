"use client";

import { useAlerts } from "@/hooks/useAlerts";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function AlertSystem() {
  const { alerts, unreadCount, markAllRead } = useAlerts();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl bg-card border shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold text-sm">Bildirimler</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-6">
                <CheckCheck className="h-3 w-3 mr-1" />
                Tümünü oku
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Bildirim yok</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-2 p-3 border-b last:border-0 text-xs",
                    !alert.read && "bg-muted/50"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full mt-1 shrink-0", SEVERITY_DOT[alert.severity])} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {alert.severity.toUpperCase()} — {alert.device_id}
                    </p>
                    {alert.shap_top_feature && (
                      <p className="text-muted-foreground">Sensor: {alert.shap_top_feature}</p>
                    )}
                    <p className="text-muted-foreground">
                      {new Date(alert.detected_at).toLocaleString("tr")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
