"use client";

interface ScoreBarProps {
  label: string;
  value: number;
  delay?: number;
  description?: string;
}

export default function ScoreBar({ label, value, delay = 0, description }: ScoreBarProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-xs tracking-widest uppercase text-text-muted/70 font-[family-name:var(--font-body)]">{label}</span>
        <span className="text-xs text-text-primary font-semibold font-[family-name:var(--font-body)]">{value}/100</span>
      </div>
      <div className="w-full h-[3px] bg-divider-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-dark via-accent to-accent-light rounded-full score-bar-fill"
          style={{
            width: `${value}%`,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
      {description && (
        <p className="text-[11px] text-text-muted/40 mt-1.5 font-[family-name:var(--font-body)]">{description}</p>
      )}
    </div>
  );
}
