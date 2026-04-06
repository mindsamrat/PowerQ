"use client";

interface ScoreBarProps {
  label: string;
  value: number;
  delay?: number;
}

export default function ScoreBar({ label, value, delay = 0 }: ScoreBarProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-text-muted font-[family-name:var(--font-body)]">{label}</span>
        <span className="text-sm text-text-primary font-[family-name:var(--font-body)]">{value}/100</span>
      </div>
      <div className="w-full h-1.5 bg-divider-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full score-bar-fill"
          style={{
            width: `${value}%`,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}
