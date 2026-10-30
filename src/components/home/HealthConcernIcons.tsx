import { useId, type ReactNode } from "react";

/**
 * Soft-3D medical icons for "Shop by health concern": glossy gradients, a
 * highlight and a soft floor shadow, all in one style. Drawn in SVG so they
 * stay sharp at any size and add no image downloads.
 */
export type ConcernIconName =
  | "diabetes"
  | "heart"
  | "thyroid"
  | "lungs"
  | "vitamins"
  | "fever"
  | "bones"
  | "full_body";

interface Shared {
  /** Unique id prefix, so gradients of different icons on one page don't clash. */
  p: string;
}

const Frame = ({ p, children }: Shared & { children: ReactNode }) => (
  <>
    <defs>
      <filter id={`${p}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={`${p}-soft`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>
    </defs>
    <ellipse cx="48" cy="88" rx="24" ry="4.5" fill="#0f172a" opacity="0.16" filter={`url(#${p}-blur)`} />
    {children}
  </>
);

/** A soft white sheen used on every icon's lit side. */
const Sheen = ({ p, cx, cy, rx, ry, rotate = 0, opacity = 0.75 }: Shared & { cx: number; cy: number; rx: number; ry: number; rotate?: number; opacity?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={opacity} transform={`rotate(${rotate} ${cx} ${cy})`} filter={`url(#${p}-soft)`} />
);

const Grad = ({ id, from, to, x2 = 0.9, y2 = 1 }: { id: string; from: string; to: string; x2?: number; y2?: number }) => (
  <linearGradient id={id} x1="0.15" y1="0" x2={x2} y2={y2}>
    <stop offset="0" stopColor={from} />
    <stop offset="1" stopColor={to} />
  </linearGradient>
);

const ICONS: Record<ConcernIconName, (props: Shared) => JSX.Element> = {
  // A blood drop with a sugar cube: blood sugar.
  diabetes: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-drop`} from="#ff7a8a" to="#c8102e" />
        <Grad id={`${p}-cube`} from="#ffffff" to="#cbd5e1" />
      </defs>
      <path d="M44 10 C44 10 18 42 18 60 a26 26 0 0 0 52 0 C70 42 44 10 44 10 Z" fill={`url(#${p}-drop)`} />
      <Sheen p={p} cx={33} cy={52} rx={5} ry={11} rotate={-18} />
      <g transform="rotate(-10 68 68)">
        <rect x="56" y="56" width="24" height="24" rx="5" fill={`url(#${p}-cube)`} />
        <rect x="56" y="56" width="24" height="24" rx="5" fill="none" stroke="#94a3b8" strokeOpacity="0.5" />
        <rect x="60" y="59" width="10" height="4" rx="2" fill="#fff" opacity="0.9" />
      </g>
    </Frame>
  ),

  // A heart with a heartbeat line.
  heart: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-heart`} from="#ff8597" to="#d61f45" />
      </defs>
      <path
        d="M48 82 C20 64 12 48 12 36 C12 23 22 14 33 14 C40 14 45 18 48 23 C51 18 56 14 63 14 C74 14 84 23 84 36 C84 48 76 64 48 82 Z"
        fill={`url(#${p}-heart)`}
      />
      <Sheen p={p} cx={29} cy={29} rx={8} ry={5} rotate={-30} />
      <path d="M20 47 H35 L40 37 L47 58 L53 42 L57 47 H76" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),

  // The butterfly-shaped thyroid gland on the windpipe.
  thyroid: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-pipe`} from="#f1f5f9" to="#cbd5e1" />
        <Grad id={`${p}-gland`} from="#b9a4ff" to="#6d3fe0" />
      </defs>
      <rect x="40" y="8" width="16" height="78" rx="8" fill={`url(#${p}-pipe)`} />
      {[18, 28, 72, 80].map((y) => (
        <rect key={y} x="41" y={y} width="14" height="3" rx="1.5" fill="#94a3b8" opacity="0.45" />
      ))}
      <ellipse cx="32" cy="50" rx="14" ry="23" transform="rotate(-14 32 50)" fill={`url(#${p}-gland)`} />
      <ellipse cx="64" cy="50" rx="14" ry="23" transform="rotate(14 64 50)" fill={`url(#${p}-gland)`} />
      <rect x="34" y="54" width="28" height="13" rx="6.5" fill={`url(#${p}-gland)`} />
      <Sheen p={p} cx={27} cy={42} rx={4} ry={9} rotate={-14} />
      <Sheen p={p} cx={59} cy={42} rx={4} ry={9} rotate={14} opacity={0.6} />
    </Frame>
  ),

  // Two lungs with the windpipe.
  lungs: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-lung`} from="#ffb3c0" to="#e8475f" />
      </defs>
      <path d="M48 8 V36 M48 34 L39 43 M48 34 L57 43" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <path d="M43 30 C38 27 32 28 27 32 C18 39 13 53 13 65 C13 77 20 83 29 83 C37 83 43 77 43 68 Z" fill={`url(#${p}-lung)`} />
      <path d="M53 30 C58 27 64 28 69 32 C78 39 83 53 83 65 C83 77 76 83 67 83 C59 83 53 77 53 68 Z" fill={`url(#${p}-lung)`} />
      <Sheen p={p} cx={24} cy={52} rx={4} ry={11} rotate={12} />
      <Sheen p={p} cx={63} cy={50} rx={3.5} ry={9} rotate={-12} opacity={0.55} />
    </Frame>
  ),

  // A two-tone capsule and a tablet.
  vitamins: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-orange`} from="#ffc078" to="#f26a0c" />
        <Grad id={`${p}-white`} from="#ffffff" to="#d6dde6" />
        <Grad id={`${p}-tab`} from="#fde68a" to="#e59e0b" />
      </defs>
      <circle cx="70" cy="72" r="11" fill={`url(#${p}-tab)`} />
      <rect x="62" y="71" width="16" height="2.5" rx="1.25" fill="#b45309" opacity="0.35" />
      <g transform="rotate(-38 46 46)">
        <path d="M32 31 H46 V61 H32 A15 15 0 0 1 32 31 Z" fill={`url(#${p}-orange)`} />
        <path d="M46 31 H60 A15 15 0 0 1 60 61 H46 Z" fill={`url(#${p}-white)`} />
        <path d="M46 31 H60 A15 15 0 0 1 60 61 H46 Z" fill="none" stroke="#94a3b8" strokeOpacity="0.45" />
        <rect x="24" y="36" width="44" height="5" rx="2.5" fill="#fff" opacity="0.7" />
      </g>
    </Frame>
  ),

  // A glass thermometer with a red reading.
  fever: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-glass`} from="#ffffff" to="#dbe3ec" x2={1} y2={0} />
        <Grad id={`${p}-red`} from="#ff6b6b" to="#c81e1e" />
      </defs>
      <g transform="rotate(32 48 48)">
        <rect x="39" y="6" width="18" height="64" rx="9" fill={`url(#${p}-glass)`} stroke="#94a3b8" strokeOpacity="0.5" />
        {[16, 24, 32, 40, 48].map((y) => (
          <rect key={y} x="51" y={y} width="4" height="1.8" rx="0.9" fill="#64748b" opacity="0.55" />
        ))}
        <rect x="44" y="28" width="8" height="46" rx="4" fill={`url(#${p}-red)`} />
        <circle cx="48" cy="76" r="14" fill={`url(#${p}-red)`} />
        <Sheen p={p} cx={43} cy={71} rx={3.5} ry={5} rotate={-20} />
        <rect x="41.5" y="10" width="3" height="50" rx="1.5" fill="#fff" opacity="0.8" />
      </g>
    </Frame>
  ),

  // A bone.
  bones: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-bone`} from="#fffaf0" to="#cdbf9f" />
      </defs>
      <g transform="rotate(-36 48 48)">
        <g fill={`url(#${p}-bone)`} stroke="#b8a888" strokeOpacity="0.45" strokeWidth="1">
          <rect x="26" y="41" width="44" height="14" rx="7" />
          <circle cx="24" cy="39" r="10" />
          <circle cx="24" cy="57" r="10" />
          <circle cx="72" cy="39" r="10" />
          <circle cx="72" cy="57" r="10" />
        </g>
        <rect x="28" y="43" width="40" height="3.5" rx="1.75" fill="#fff" opacity="0.9" />
        <Sheen p={p} cx={21} cy={35} rx={4} ry={3} />
        <Sheen p={p} cx={69} cy={35} rx={4} ry={3} opacity={0.6} />
      </g>
    </Frame>
  ),

  // A person inside a scan frame: whole-body checkup.
  full_body: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-body`} from="#7cb8ff" to="#1d5fd6" />
      </defs>
      <path d="M14 26 V16 a4 4 0 0 1 4 -4 H28 M68 12 H78 a4 4 0 0 1 4 4 V26 M82 66 V76 a4 4 0 0 1 -4 4 H68 M28 80 H18 a4 4 0 0 1 -4 -4 V66" fill="none" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="28" r="11" fill={`url(#${p}-body)`} />
      <path d="M27 78 C27 55 35 43 48 43 C61 43 69 55 69 78 Z" fill={`url(#${p}-body)`} />
      <Sheen p={p} cx={43} cy={24} rx={3.5} ry={4.5} rotate={-20} />
      <Sheen p={p} cx={36} cy={56} rx={3} ry={9} rotate={18} opacity={0.5} />
      <rect x="18" y="52" width="60" height="3.5" rx="1.75" fill="#22d3ee" opacity="0.9" />
      <rect x="18" y="49" width="60" height="9" rx="4.5" fill="#22d3ee" opacity="0.18" />
    </Frame>
  ),
};

export function HealthConcernIcon({ name, className }: { name: ConcernIconName; className?: string }) {
  const p = `hc${useId().replace(/:/g, "")}`;
  const Icon = ICONS[name];
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <Icon p={p} />
    </svg>
  );
}
