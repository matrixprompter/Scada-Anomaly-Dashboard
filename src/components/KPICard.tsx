"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "danger";
}

export function KPICard({ title, value, subtitle, trend, icon, variant = "default" }: KPICardProps) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const displayValue = typeof value === "number" && isNaN(value) ? "—" : value;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 border transition-all duration-200",
        "bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md",
        variant === "warning" && "border-yellow-300/60 dark:border-yellow-700/40 bg-yellow-50/50 dark:bg-yellow-950/10",
        variant === "danger" && "border-red-300/60 dark:border-red-700/40 bg-red-50/50 dark:bg-red-950/10"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-2xl font-bold mt-1.5 tracking-tight">{displayValue}</p>
      <div className="flex items-center gap-1 mt-1">
        {trend !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend > 0 && "text-red-500",
              trend < 0 && "text-green-500",
              trend === 0 && "text-muted-foreground"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}
