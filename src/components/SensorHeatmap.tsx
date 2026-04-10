"use client";

import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

interface HeatmapData {
  matrix: number[][];
  sensors: string[];
  hours: number[];
}

export function SensorHeatmap({ deviceId }: { deviceId?: string }) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [days, setDays] = useState(7);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) });
    if (deviceId) params.set("device_id", deviceId);
    fetch(`/api/heatmap?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [days, deviceId]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 10, bottom: 30, left: 100 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(200, data.sensors.length * 20);
    const cellW = width / 24;
    const cellH = height / data.sensors.length;

    const g = svg
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = Math.max(1, ...data.matrix.flat());
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxVal]);

    // Cells
    data.sensors.forEach((sensor, si) => {
      data.hours.forEach((hour, hi) => {
        g.append("rect")
          .attr("x", hi * cellW)
          .attr("y", si * cellH)
          .attr("width", cellW - 1)
          .attr("height", cellH - 1)
          .attr("rx", 2)
          .attr("fill", colorScale(data.matrix[si][hi]))
          .append("title")
          .text(`${sensor} @ ${hour}:00 — ${data.matrix[si][hi]} anomali`);
      });
    });

    // Y axis (sensor names)
    data.sensors.forEach((sensor, si) => {
      g.append("text")
        .attr("x", -4)
        .attr("y", si * cellH + cellH / 2 + 4)
        .attr("text-anchor", "end")
        .attr("font-size", "9px")
        .attr("fill", "currentColor")
        .text(sensor.replace(/_/g, " ").slice(0, 15));
    });

    // X axis (hours)
    for (let h = 0; h < 24; h += 3) {
      g.append("text")
        .attr("x", h * cellW + cellW / 2)
        .attr("y", height + 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("fill", "currentColor")
        .text(`${h}:00`);
    }
  }, [data]);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Sensor / Saat Isi Haritasi</h3>
        <div className="flex gap-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-0.5 rounded text-xs ${days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ minHeight: 220 }} />
    </div>
  );
}
