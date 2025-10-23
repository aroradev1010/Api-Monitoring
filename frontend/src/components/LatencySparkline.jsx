import React from "react";

export default function LatencySparkline({
  metrics = [],
  width = 200,
  height = 40,
}) {
  const points = metrics.map((m, i) => {
    const x = (i / Math.max(1, metrics.length - 1)) * width;
    return {
      x,
      y:
        height -
        Math.min(
          height,
          (m.latency_ms / Math.max(...metrics.map((t) => t.latency_ms), 1)) *
            height
        ),
    };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ background: "#fff" }}>
      <path d={path} stroke="#007bff" fill="none" strokeWidth="2" />
    </svg>
  );
}
