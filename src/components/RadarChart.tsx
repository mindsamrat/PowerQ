"use client";

interface RadarChartProps {
  control: number;
  visibility: number;
  patience: number;
}

export default function RadarChart({ control, visibility, patience }: RadarChartProps) {
  const cx = 150;
  const cy = 150;
  const r = 100;

  // 3 axes at 120 degree intervals, starting from top
  const axes = [
    { label: "Control", angle: -90, value: control },
    { label: "Visibility", angle: 30, value: visibility },
    { label: "Patience", angle: 150, value: patience },
  ];

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const getPoint = (angle: number, value: number) => ({
    x: cx + (r * value / 100) * Math.cos(toRad(angle)),
    y: cy + (r * value / 100) * Math.sin(toRad(angle)),
  });

  // Grid levels
  const gridLevels = [25, 50, 75, 100];

  // Data points
  const points = axes.map((a) => getPoint(a.angle, a.value));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex justify-center">
      <svg width="300" height="300" viewBox="0 0 300 300" className="overflow-visible">
        {/* Grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={cx}
            cy={cy}
            r={(r * level) / 100}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axes.map((a, i) => {
          const end = getPoint(a.angle, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon - filled */}
        <polygon
          points={polygonPoints}
          fill="rgba(196, 30, 58, 0.1)"
          stroke="rgba(196, 30, 58, 0.6)"
          strokeWidth="1.5"
          className="radar-polygon"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#C41E3A"
            stroke="#0A0A0A"
            strokeWidth="2"
            className="radar-polygon"
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          />
        ))}

        {/* Labels */}
        {axes.map((a, i) => {
          const labelPoint = getPoint(a.angle, 125);
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              {a.label}
            </text>
          );
        })}

        {/* Value labels */}
        {axes.map((a, i) => {
          const valPoint = getPoint(a.angle, a.value + 15);
          return (
            <text
              key={`v${i}`}
              x={valPoint.x}
              y={valPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-body)"
            >
              {a.value}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
