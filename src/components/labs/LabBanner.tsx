import { memo } from "react";

/**
 * SVG-based lab banner. Replaces heavy AI-generated JPGs with an instant-rendering
 * vector graphic that mimics the original DNA-helix / molecule lab aesthetic.
 * No network image fetch — paints in <1ms.
 */

export interface LabBannerTheme {
  /** Two-stop gradient (top-left → bottom-right) */
  from: string;
  via: string;
  to: string;
  /** Tint of the floating molecule / cell shapes */
  accent: string;
}

const THEMES: Record<string, LabBannerTheme> = {
  "Dr. Lal PathLabs":     { from: "#001f5b", via: "#0052cc", to: "#0a82ff", accent: "#7dd3fc" },
  "Thyrocare":            { from: "#3b0764", via: "#7c3aed", to: "#a855f7", accent: "#f0abfc" },
  "Metropolis Healthcare":{ from: "#064e3b", via: "#14b8a6", to: "#5eead4", accent: "#a7f3d0" },
  "SRL Diagnostics":      { from: "#7f1d1d", via: "#dc2626", to: "#fb7185", accent: "#fecaca" },
  "Apollo Diagnostics":   { from: "#0c4a6e", via: "#0284c7", to: "#38bdf8", accent: "#bae6fd" },
  "LifeCare Diagnostics": { from: "#064e3b", via: "#059669", to: "#34d399", accent: "#bbf7d0" },
};

const FALLBACKS: LabBannerTheme[] = [
  { from: "#1e1b4b", via: "#4338ca", to: "#818cf8", accent: "#c7d2fe" },
  { from: "#0f172a", via: "#0ea5e9", to: "#38bdf8", accent: "#bae6fd" },
  { from: "#3f0d33", via: "#be185d", to: "#f472b6", accent: "#fbcfe8" },
  { from: "#052e2b", via: "#0d9488", to: "#5eead4", accent: "#99f6e4" },
];

export function getLabBannerTheme(labName: string): LabBannerTheme {
  if (THEMES[labName]) return THEMES[labName];
  // deterministic by name
  let hash = 0;
  for (let i = 0; i < labName.length; i++) hash = (hash * 31 + labName.charCodeAt(i)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}

interface LabBannerProps {
  labName: string;
  className?: string;
}

const LabBanner = memo(({ labName, className = "" }: LabBannerProps) => {
  const t = getLabBannerTheme(labName);
  const id = `lab-bg-${labName.replace(/\W+/g, "")}`;

  return (
    <svg
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.from} />
          <stop offset="55%" stopColor={t.via} />
          <stop offset="100%" stopColor={t.to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="80%" cy="20%" r="60%">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-dots`} x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#ffffff" fillOpacity="0.18" />
        </pattern>
      </defs>

      {/* Base gradient */}
      <rect width="800" height="320" fill={`url(#${id}-grad)`} />
      {/* Soft top-right glow */}
      <rect width="800" height="320" fill={`url(#${id}-glow)`} />
      {/* Subtle dot grid */}
      <rect width="800" height="320" fill={`url(#${id}-dots)`} />

      {/* DNA helix — two sine ribbons */}
      <g opacity="0.55" stroke={t.accent} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M-20 160 Q 100 60 220 160 T 460 160 T 700 160 T 940 160" />
        <path d="M-20 160 Q 100 260 220 160 T 460 160 T 700 160 T 940 160" />
        {/* rungs */}
        {Array.from({ length: 14 }).map((_, i) => {
          const x = -20 + i * 60;
          const phase = Math.sin((i / 2) * Math.PI);
          const y1 = 160 - 50 * phase;
          const y2 = 160 + 50 * phase;
          return <line key={i} x1={x} y1={y1} x2={x} y2={y2} strokeOpacity="0.4" />;
        })}
      </g>

      {/* Floating molecule cluster */}
      <g opacity="0.85" transform="translate(560 70)">
        <circle r="34" fill={t.accent} fillOpacity="0.25" />
        <circle cx="60" cy="20" r="22" fill={t.accent} fillOpacity="0.35" />
        <circle cx="-30" cy="40" r="18" fill="#ffffff" fillOpacity="0.25" />
        <circle cx="20" cy="-40" r="14" fill="#ffffff" fillOpacity="0.4" />
        <line x1="0" y1="0" x2="60" y2="20" stroke={t.accent} strokeOpacity="0.5" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="-30" y2="40" stroke={t.accent} strokeOpacity="0.5" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="20" y2="-40" stroke={t.accent} strokeOpacity="0.5" strokeWidth="1.5" />
      </g>

      {/* Bottom corner cells */}
      <g opacity="0.4">
        <circle cx="80" cy="280" r="60" fill={t.accent} fillOpacity="0.12" />
        <circle cx="40" cy="260" r="22" fill="#ffffff" fillOpacity="0.18" />
        <circle cx="140" cy="300" r="14" fill="#ffffff" fillOpacity="0.22" />
      </g>

      {/* Subtle diagonal sheen */}
      <path d="M0 0 L 280 0 L 80 320 L 0 320 Z" fill="#ffffff" fillOpacity="0.04" />
    </svg>
  );
});

LabBanner.displayName = "LabBanner";
export default LabBanner;
