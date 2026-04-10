"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertSystem } from "@/components/AlertSystem";
import { SensorControl } from "@/components/SensorControl";
import { Onboarding } from "@/components/Onboarding";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        {/* Top bar: logo + icons */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">AD</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">
              Anomaly Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop: sensor control inline */}
            <div className="hidden md:flex items-center gap-2" id="onboard-sensor-control">
              <SensorControl />
              <div className="h-5 w-px bg-border/50 mx-1" />
            </div>
            <Onboarding />
            <AlertSystem />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>

        {/* Mobile: sensor control below logo */}
        <div className="md:hidden border-t border-border/30 px-4 py-2" id="onboard-sensor-control-mobile">
          <SensorControl />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
