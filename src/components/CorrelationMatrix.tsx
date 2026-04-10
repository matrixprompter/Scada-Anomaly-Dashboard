"use client";

import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

interface CorrelationData {
  matrix: number[][];
  labels: string[];
}

export function CorrelationMatrix({ deviceId }: { deviceId?: string }) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const params = deviceId ? `?device_id=${deviceId}` : "";
    fetch(`/api/correlation${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const n = data.labels.length;
    const margin = { top: 10, right: 10, bottom: 10, left: 100 };
    const size = Math.min(svgRef.current.clientWidth - margin.left - margin.right, 400);
    const cellSize = size / n;

    const g = svg
      .attr("height", size + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        g.append("rect")
          .attr("x", j * cellSize)
          .attr("y", i * cellSize)
          .attr("width", cellSize - 1)
          .attr("height", cellSize - 1)
          .attr("rx", 2)
          .attr("fill", colorScale(data.matrix[i][j]))
          .append("title")
          .text(`${data.labels[i]} x ${data.labels[j]}: ${data.matrix[i][j]}`);
      }
    }

    // Labels
    data.labels.forEach((label, i) => {
      g.append("text")
        .attr("x", -4)
        .attr("y", i * cellSize + cellSize / 2 + 3)
        .attr("text-anchor", "end")
        .attr("font-size", "8px")
        .attr("fill", "currentColor")
        .text(label.replace(/_/g, " ").slice(0, 14));
    });
  }, [data]);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm border">
      <h3 className="font-semibold text-sm mb-3">Sensor Korelasyon Matrisi</h3>
      <svg ref={svgRef} className="w-full" style={{ minHeight: 300 }} />
    </div>
  );
}
