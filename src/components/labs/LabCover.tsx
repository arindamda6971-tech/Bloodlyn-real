import { memo, useId } from "react";
import { MapPin } from "lucide-react";
import { labInitials } from "./lab-display";

/**
 * A generated banner for a lab card: a light tint and a faint hexagon pattern
 * in a colour picked from the lab's name, one small soft-3D object (microscope
 * or test-tube rack, also picked from the name), and the lab's initials, name
 * and city. Labs don't upload photos, and this costs no image download, so Home
 * stays quick on low-end phones.
 */
interface Palette {
  /** Background gradient, light to near-white. */
  from: string;
  to: string;
  /** Liquid / knob colour in the illustration. */
  accent: string;
  accentDark: string;
  /** Initials and subtitle colour. */
  ink: string;
}

const PALETTES: Palette[] = [
  { from: "#ccfbf1", to: "#f0fdfa", accent: "#2dd4bf", accentDark: "#0f766e", ink: "#0f766e" },
  { from: "#e0e7ff", to: "#f5f7ff", accent: "#818cf8", accentDark: "#4338ca", ink: "#4338ca" },
  { from: "#dbeafe", to: "#f1f7ff", accent: "#60a5fa", accentDark: "#1d4ed8", ink: "#1d4ed8" },
  { from: "#ede9fe", to: "#f8f6ff", accent: "#a78bfa", accentDark: "#6d28d9", ink: "#6d28d9" },
  { from: "#ffe4e6", to: "#fff5f6", accent: "#fb7185", accentDark: "#be123c", ink: "#be123c" },
  { from: "#fef3c7", to: "#fffbeb", accent: "#fbbf24", accentDark: "#b45309", ink: "#b45309" },
];

export type LabArt = "microscope" | "tubes";
export const LAB_PALETTE_COUNT = PALETTES.length;

/** FNV-1a with a final mix, so similar names still spread over the colours. */
const nameHash = (name: string) => {
  let h = 0x811c9dc5;
  for (const c of name.trim().toLowerCase()) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

/** The lab's own colour (index into the palettes), the same every time. */
export const labPaletteIndex = (name: string) => nameHash(name) % PALETTES.length;

/**
 * Looks for a row of labs: each keeps its own colour unless the card before it
 * has the same one (then it takes the next), and the illustration alternates,
 * so neighbouring cards always differ.
 */
export function labCoverVariants(names: string[]): { palette: number; art: LabArt }[] {
  let prev = -1;
  return names.map((name, i) => {
    let palette = labPaletteIndex(name);
    if (palette === prev) palette = (palette + 1) % PALETTES.length;
    prev = palette;
    return { palette, art: i % 2 === 0 ? "microscope" : "tubes" };
  });
}

const hexPattern = (stroke: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='48' viewBox='0 0 28 48'%3E%3Cpath d='M14 0 L28 8 V24 L14 32 L0 24 V8 Z M14 32 V48' fill='none' stroke='${encodeURIComponent(stroke)}' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E")`;

const Microscope = ({ p, c }: { p: string; c: Palette }) => (
  <svg viewBox="0 -28 110 148" className="absolute right-2.5 bottom-0 w-[62px] h-[84px]" aria-hidden="true" focusable="false">
    <defs>
      <filter id={`${p}-b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
      <linearGradient id={`${p}-m`} x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#64748b" /><stop offset="1" stopColor="#1e293b" /></linearGradient>
      <linearGradient id={`${p}-w`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfd8e3" /></linearGradient>
      <linearGradient id={`${p}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.accent} /><stop offset="1" stopColor={c.accentDark} /></linearGradient>
    </defs>
    <ellipse cx="56" cy="112" rx="40" ry="5" fill="#0f172a" opacity="0.16" filter={`url(#${p}-b)`} />
    <rect x="20" y="98" width="72" height="13" rx="6.5" fill={`url(#${p}-m)`} />
    <path d="M74 99 V70 C74 46 62 32 44 26" fill="none" stroke={`url(#${p}-m)`} strokeWidth="15" strokeLinecap="round" />
    <rect x="24" y="70" width="52" height="7" rx="3.5" fill="#334155" />
    <rect x="34" y="66" width="24" height="5" rx="1.5" fill="#bfdbfe" />
    <g transform="rotate(-28 42 28)">
      <rect x="32" y="-12" width="20" height="58" rx="7" fill={`url(#${p}-w)`} />
      <rect x="34" y="-22" width="16" height="12" rx="3.5" fill="#334155" />
      <rect x="36" y="46" width="12" height="10" rx="3" fill="#475569" />
      <rect x="34.5" y="-8" width="4" height="48" rx="2" fill="#fff" opacity="0.9" />
    </g>
    <circle cx="74" cy="76" r="8" fill={`url(#${p}-a)`} />
    <ellipse cx="72" cy="73.5" rx="3" ry="2" fill="#fff" opacity="0.6" />
  </svg>
);

const TestTubes = ({ p, c }: { p: string; c: Palette }) => (
  <svg viewBox="0 0 110 120" className="absolute right-2.5 bottom-1 w-[66px] h-[72px]" aria-hidden="true" focusable="false">
    <defs>
      <filter id={`${p}-b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
      <linearGradient id={`${p}-g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="1" stopColor="#dbe4ee" stopOpacity="0.95" /></linearGradient>
      <linearGradient id={`${p}-w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfd8e3" /></linearGradient>
      <linearGradient id={`${p}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.accent} /><stop offset="1" stopColor={c.accentDark} /></linearGradient>
      <linearGradient id={`${p}-r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b81" /><stop offset="1" stopColor="#c8102e" /></linearGradient>
      <linearGradient id={`${p}-y`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fcd34d" /><stop offset="1" stopColor="#d97706" /></linearGradient>
    </defs>
    <ellipse cx="55" cy="112" rx="42" ry="5" fill="#0f172a" opacity="0.16" filter={`url(#${p}-b)`} />
    {([[22, "r", 34], [44, "a", 44], [66, "y", 28]] as const).map(([x, g, h]) => (
      <g key={x}>
        <rect x={x} y="14" width="18" height="86" rx="9" fill={`url(#${p}-g)`} stroke="#94a3b8" strokeOpacity="0.45" />
        <rect x={x + 2.5} y={98 - h} width="13" height={h} rx="6.5" fill={`url(#${p}-${g})`} />
        <rect x={x + 3} y="20" width="3" height="66" rx="1.5" fill="#fff" opacity="0.9" />
        <rect x={x - 1} y="10" width="20" height="8" rx="3" fill="#cbd5e1" />
      </g>
    ))}
    <rect x="12" y="58" width="86" height="10" rx="4" fill={`url(#${p}-w)`} stroke="#94a3b8" strokeOpacity="0.4" />
    <rect x="12" y="92" width="86" height="16" rx="5" fill={`url(#${p}-w)`} stroke="#94a3b8" strokeOpacity="0.4" />
  </svg>
);

interface Props {
  name: string;
  city?: string | null;
  logoUrl?: string | null;
  /** Colour and illustration; defaults to the lab's own colour with a microscope. */
  palette?: number;
  art?: LabArt;
  /** Size and position; include "relative" or "absolute" (default "relative"). */
  className?: string;
}

export const LabCover = memo(({ name, city, logoUrl, palette, art = "microscope", className = "relative" }: Props) => {
  const p = `lc${useId().replace(/:/g, "")}`;
  const c = PALETTES[(palette ?? labPaletteIndex(name)) % PALETTES.length];
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ backgroundImage: `${hexPattern(c.accentDark)}, linear-gradient(135deg, ${c.from}, ${c.to} 70%)`, backgroundSize: "28px 48px, auto" }}
    >
      {art === "microscope" ? <Microscope p={p} c={c} /> : <TestTubes p={p} c={c} />}
      <div className="absolute left-4 right-[76px] bottom-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.3)] flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-10 h-10 object-contain" loading="lazy" decoding="async" />
          ) : (
            <span className="text-base font-black tracking-tight" style={{ color: c.ink }}>{labInitials(name)}</span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-black text-slate-900 text-[15.5px] leading-tight truncate">{name}</h4>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold truncate" style={{ color: c.ink }}>
            <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate opacity-80">{city || "Diagnostic lab"}</span>
          </p>
        </div>
      </div>
    </div>
  );
});

LabCover.displayName = "LabCover";
