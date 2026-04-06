"use client";

interface ArchetypeIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export default function ArchetypeIcon({ icon, size = 80, className = "" }: ArchetypeIconProps) {
  const strokeWidth = 1.5;
  const color = "white";

  const icons: Record<string, React.ReactNode> = {
    crown: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <path d="M16 56L8 24L24 36L40 16L56 36L72 24L64 56H16Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <line x1="16" y1="60" x2="64" y2="60" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="40" cy="16" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="8" cy="24" r="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="72" cy="24" r="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </svg>
    ),
    eye: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <path d="M8 40C8 40 20 20 40 20C60 20 72 40 72 40C72 40 60 60 40 60C20 60 8 40 8 40Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="40" cy="40" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="40" cy="40" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <line x1="40" y1="12" x2="40" y2="20" stroke={color} strokeWidth={strokeWidth} />
        <line x1="40" y1="60" x2="40" y2="68" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    ),
    compass: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <circle cx="40" cy="40" r="28" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="40" cy="40" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <polygon points="40,16 44,36 40,40 36,36" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <polygon points="40,64 36,44 40,40 44,44" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <polygon points="16,40 36,36 40,40 36,44" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <polygon points="64,40 44,44 40,40 44,36" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <line x1="40" y1="10" x2="40" y2="14" stroke={color} strokeWidth={strokeWidth} />
        <line x1="40" y1="66" x2="40" y2="70" stroke={color} strokeWidth={strokeWidth} />
        <line x1="10" y1="40" x2="14" y2="40" stroke={color} strokeWidth={strokeWidth} />
        <line x1="66" y1="40" x2="70" y2="40" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    ),
    flame: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <path d="M40 8C40 8 56 24 56 44C56 56 48 68 40 68C32 68 24 56 24 44C24 24 40 8 40 8Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <path d="M40 36C40 36 48 44 48 52C48 58 44 64 40 64C36 64 32 58 32 52C32 44 40 36 40 36Z" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </svg>
    ),
    scales: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <line x1="40" y1="12" x2="40" y2="68" stroke={color} strokeWidth={strokeWidth} />
        <line x1="16" y1="24" x2="64" y2="24" stroke={color} strokeWidth={strokeWidth} />
        <line x1="16" y1="24" x2="12" y2="44" stroke={color} strokeWidth={strokeWidth} />
        <line x1="64" y1="24" x2="68" y2="44" stroke={color} strokeWidth={strokeWidth} />
        <path d="M4 44C4 44 12 52 20 44" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <path d="M60 44C60 44 68 52 76 44" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <line x1="32" y1="68" x2="48" y2="68" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="40" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </svg>
    ),
    dagger: (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
        <line x1="40" y1="8" x2="40" y2="60" stroke={color} strokeWidth={strokeWidth} />
        <polygon points="40,8 36,20 40,18 44,20" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <line x1="28" y1="28" x2="52" y2="28" stroke={color} strokeWidth={strokeWidth} />
        <line x1="34" y1="60" x2="46" y2="60" stroke={color} strokeWidth={strokeWidth} />
        <line x1="36" y1="60" x2="36" y2="72" stroke={color} strokeWidth={strokeWidth} />
        <line x1="44" y1="60" x2="44" y2="72" stroke={color} strokeWidth={strokeWidth} />
        <line x1="34" y1="72" x2="46" y2="72" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    ),
  };

  return icons[icon] || null;
}
