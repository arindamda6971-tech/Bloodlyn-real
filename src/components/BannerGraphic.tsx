import { memo } from "react";

interface BannerGraphicProps {
  /** Index used to deterministically pick palette + decoration */
  variant?: number;
  className?: string;
  /** Optional accent hue override (0-360) */
  hue?: number;
}

/**
 * Pure-SVG/CSS banner graphic — zero network cost, paints instantly.
 * Replaces previously rendered raster JPG banners that delayed first paint.
 * Renders a layered gradient with abstract medical motifs (pulse line + blob).
 */
const palettes = [
  { from: "hsl(210, 90%, 55%)", to: "hsl(195, 85%, 45%)", glow: "hsl(190, 100%, 70%)" },
  { from: "hsl(220, 85%, 50%)", to: "hsl(260, 75%, 55%)", glow: "hsl(280, 90%, 75%)" },
  { from: "hsl(180, 80%, 40%)", to: "hsl(210, 90%, 50%)", glow: "hsl(170, 90%, 70%)" },
  { from: "hsl(200, 90%, 45%)", to: "hsl(225, 80%, 35%)", glow: "hsl(205, 95%, 70%)" },
];

const BannerGraphic = ({ variant = 0, className = "", hue }: BannerGraphicProps) => {
  const p = hue != null
    ? {
        from: `hsl(${hue}, 85%, 50%)`,
        to: `hsl(${(hue + 30) % 360}, 80%, 38%)`,
        glow: `hsl(${(hue + 15) % 360}, 95%, 72%)`,
      }
    : palettes[variant % palettes.length];

  return (
    <svg
      className={className}
      viewBox="0 0 1024 512"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={`bg-${variant}-${hue ?? "x"}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        <radialGradient id={`glow-${variant}-${hue ?? "x"}`} cx="0.8" cy="0.2" r="0.9">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="60%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1024" height="512" fill={`url(#bg-${variant}-${hue ?? "x"})`} />
      <rect width="1024" height="512" fill={`url(#glow-${variant}-${hue ?? "x"})`} />
      {/* Soft blob */}
      <circle cx="850" cy="120" r="180" fill="white" opacity="0.08" />
      <circle cx="120" cy="420" r="140" fill="white" opacity="0.06" />
      {/* Pulse line */}
      <path
        d="M 40 320 L 240 320 L 280 240 L 320 400 L 360 280 L 400 340 L 460 320 L 1000 320"
        fill="none"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Plus marks */}
      <g fill="white" opacity="0.14">
        <rect x="700" y="380" width="36" height="8" rx="2" />
        <rect x="714" y="366" width="8" height="36" rx="2" />
        <rect x="940" y="430" width="24" height="6" rx="2" />
        <rect x="949" y="421" width="6" height="24" rx="2" />
      </g>
    </svg>
  );
};

export default memo(BannerGraphic);
