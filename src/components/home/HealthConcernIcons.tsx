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
  | "full_body"
  // Test categories (Explore Tests)
  | "blood"
  | "test_tube"
  | "microbe"
  | "sample_cup"
  | "pollen"
  | "shield"
  | "ribbon"
  | "bandage"
  | "petri"
  | "bottle"
  | "microscope"
  | "magnifier"
  | "flask"
  | "dna"
  | "stethoscope";

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

  // ── Test categories (Explore Tests) ──────────────────────────────────────

  // A blood drop.
  blood: ({ p }) => (
    <Frame p={p}>
      <defs><Grad id={`${p}-drop`} from="#ff7a8a" to="#c8102e" /></defs>
      <path d="M48 8 C48 8 21 41 21 60 a27 27 0 0 0 54 0 C75 41 48 8 48 8 Z" fill={`url(#${p}-drop)`} />
      <Sheen p={p} cx={36} cy={54} rx={5} ry={12} rotate={-18} />
    </Frame>
  ),

  // A test tube with liquid.
  test_tube: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-glass`} from="#ffffff" to="#d6dee8" x2={1} y2={0} />
        <Grad id={`${p}-liq`} from="#5eead4" to="#0d9488" />
      </defs>
      <g transform="rotate(28 48 48)">
        <rect x="37" y="10" width="22" height="72" rx="11" fill={`url(#${p}-glass)`} stroke="#94a3b8" strokeOpacity="0.5" />
        <rect x="40" y="44" width="16" height="35" rx="8" fill={`url(#${p}-liq)`} />
        <rect x="34" y="6" width="28" height="9" rx="3.5" fill="#cbd5e1" />
        <rect x="40.5" y="16" width="3.5" height="56" rx="1.75" fill="#fff" opacity="0.9" />
        <circle cx="50" cy="56" r="2.2" fill="#fff" opacity="0.7" />
        <circle cx="46" cy="66" r="1.6" fill="#fff" opacity="0.6" />
      </g>
    </Frame>
  ),

  // A virus particle.
  microbe: ({ p }) => (
    <Frame p={p}>
      <defs>
        <radialGradient id={`${p}-v`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bbf7d0" /><stop offset="0.5" stopColor="#4ade80" /><stop offset="1" stopColor="#15803d" />
        </radialGradient>
      </defs>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 48 46)`}>
          <rect x="46" y="10" width="4" height="14" rx="2" fill="#16a34a" />
          <circle cx="48" cy="11" r="4.5" fill="#86efac" stroke="#16a34a" strokeWidth="1.5" />
        </g>
      ))}
      <circle cx="48" cy="46" r="23" fill={`url(#${p}-v)`} />
      <circle cx="56" cy="52" r="4" fill="#15803d" opacity="0.35" />
      <circle cx="42" cy="56" r="3" fill="#15803d" opacity="0.3" />
      <circle cx="58" cy="38" r="2.5" fill="#15803d" opacity="0.3" />
      <Sheen p={p} cx={40} cy={36} rx={6} ry={4} rotate={-30} />
    </Frame>
  ),

  // A sample container (urine, stool, fluids).
  sample_cup: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-cup`} from="#ffffff" to="#dbe3ec" x2={1} y2={0} />
        <Grad id={`${p}-liq`} from="#fde68a" to="#f59e0b" />
        <Grad id={`${p}-lid`} from="#7cb8ff" to="#1d4ed8" />
      </defs>
      <rect x="25" y="30" width="46" height="54" rx="9" fill={`url(#${p}-cup)`} stroke="#94a3b8" strokeOpacity="0.5" />
      <rect x="28" y="56" width="40" height="25" rx="7" fill={`url(#${p}-liq)`} opacity="0.95" />
      <rect x="33" y="40" width="30" height="12" rx="2.5" fill="#fff" stroke="#cbd5e1" />
      <rect x="36" y="44" width="16" height="2" rx="1" fill="#94a3b8" />
      <rect x="21" y="18" width="54" height="15" rx="6" fill={`url(#${p}-lid)`} />
      <rect x="25" y="21" width="34" height="3.5" rx="1.75" fill="#fff" opacity="0.45" />
      <rect x="29" y="36" width="3" height="42" rx="1.5" fill="#fff" opacity="0.8" />
    </Frame>
  ),

  // A flower shedding pollen: allergies.
  pollen: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-pet`} from="#fde68a" to="#f59e0b" />
        <radialGradient id={`${p}-mid`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#b45309" /><stop offset="1" stopColor="#713f12" /></radialGradient>
      </defs>
      <path d="M46 56 C44 70 40 78 36 86" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="34" cy="76" rx="9" ry="4.5" transform="rotate(-30 34 76)" fill="#22c55e" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="46" cy="24" rx="9" ry="14" transform={`rotate(${a} 46 40)`} fill={`url(#${p}-pet)`} />
      ))}
      <circle cx="46" cy="40" r="10" fill={`url(#${p}-mid)`} />
      <Sheen p={p} cx={43} cy={36} rx={3} ry={2} />
      {[[72, 22, 2.6], [78, 34, 2], [70, 44, 1.8], [80, 50, 2.3]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#f59e0b" opacity="0.85" />
      ))}
    </Frame>
  ),

  // A shield with a cross: immunity.
  shield: ({ p }) => (
    <Frame p={p}>
      <defs><Grad id={`${p}-sh`} from="#7cb8ff" to="#1d4ed8" /></defs>
      <path d="M48 8 L78 19 V43 C78 64 65 78 48 86 C31 78 18 64 18 43 V19 Z" fill={`url(#${p}-sh)`} />
      <path d="M48 14 L72 23 V43 C72 60 62 72 48 79 Z" fill="#fff" opacity="0.12" />
      <rect x="43" y="30" width="10" height="32" rx="3" fill="#fff" />
      <rect x="32" y="41" width="32" height="10" rx="3" fill="#fff" />
      <Sheen p={p} cx={30} cy={28} rx={4} ry={9} rotate={-10} opacity={0.6} />
    </Frame>
  ),

  // An awareness ribbon: cancer screening.
  ribbon: ({ p }) => (
    <Frame p={p}>
      <defs><Grad id={`${p}-rb`} from="#fbcfe8" to="#db2777" /></defs>
      <path d="M48 16 C58 16 62 30 56 42 L36 84" fill="none" stroke={`url(#${p}-rb)`} strokeWidth="13" strokeLinecap="butt" />
      <path d="M48 16 C38 16 34 30 40 42 L60 84" fill="none" stroke={`url(#${p}-rb)`} strokeWidth="13" strokeLinecap="butt" />
      <path d="M44 20 C40 24 39 32 42 40" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  ),

  // An adhesive bandage: blood clotting.
  bandage: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-band`} from="#fcd9b6" to="#e0996b" />
        <Grad id={`${p}-pad`} from="#fffaf3" to="#f1dfcb" />
      </defs>
      <g transform="rotate(-38 48 48)">
        <rect x="10" y="34" width="76" height="28" rx="14" fill={`url(#${p}-band)`} />
        <rect x="34" y="36" width="28" height="24" rx="5" fill={`url(#${p}-pad)`} />
        {[18, 24, 70, 76].map((x) => [41, 48, 55].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#b9774f" opacity="0.5" />))}
        <rect x="14" y="37" width="66" height="4" rx="2" fill="#fff" opacity="0.4" />
      </g>
    </Frame>
  ),

  // A petri dish with colonies: cultures.
  petri: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-dish`} from="#ffffff" to="#cfd8e3" />
        <Grad id={`${p}-agar`} from="#fde68a" to="#fbbf24" />
      </defs>
      <ellipse cx="48" cy="62" rx="38" ry="17" fill={`url(#${p}-dish)`} stroke="#94a3b8" strokeOpacity="0.5" />
      <ellipse cx="48" cy="56" rx="38" ry="17" fill={`url(#${p}-dish)`} stroke="#94a3b8" strokeOpacity="0.5" />
      <ellipse cx="48" cy="56" rx="32" ry="13" fill={`url(#${p}-agar)`} />
      {[[36, 52, 3.5, "#fff"], [52, 50, 2.5, "#f472b6"], [60, 58, 3, "#fff"], [44, 61, 2.2, "#a78bfa"], [30, 59, 2, "#f472b6"]].map(([x, y, r, f]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r={r as number} fill={f as string} opacity="0.9" />
      ))}
      <path d="M16 50 C22 42 40 38 54 39" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  ),

  // An amber medicine bottle: drug testing.
  bottle: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-amb`} from="#fbbf24" to="#b45309" />
        <Grad id={`${p}-cap`} from="#ffffff" to="#cbd5e1" />
      </defs>
      <rect x="29" y="28" width="38" height="58" rx="9" fill={`url(#${p}-amb)`} />
      <rect x="37" y="20" width="22" height="10" rx="2" fill="#92400e" />
      <rect x="33" y="8" width="30" height="15" rx="4" fill={`url(#${p}-cap)`} />
      <rect x="29" y="46" width="38" height="22" fill="#fff" opacity="0.95" />
      <rect x="35" y="52" width="20" height="3" rx="1.5" fill="#e11d48" />
      <rect x="35" y="59" width="26" height="2.5" rx="1.25" fill="#cbd5e1" />
      <rect x="32" y="32" width="4" height="12" rx="2" fill="#fff" opacity="0.5" />
    </Frame>
  ),

  // A microscope: cell studies.
  microscope: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-m`} from="#64748b" to="#1e293b" />
        <Grad id={`${p}-w`} from="#ffffff" to="#cfd8e3" x2={1} y2={0} />
        <Grad id={`${p}-k`} from="#60a5fa" to="#1d4ed8" />
      </defs>
      <rect x="18" y="76" width="60" height="11" rx="5.5" fill={`url(#${p}-m)`} />
      <path d="M62 77 V56 C62 38 52 28 38 24" fill="none" stroke={`url(#${p}-m)`} strokeWidth="12" strokeLinecap="round" />
      <rect x="20" y="56" width="42" height="6" rx="3" fill="#334155" />
      <rect x="28" y="52" width="20" height="4" rx="1.5" fill="#bfdbfe" />
      <g transform="rotate(-28 36 26)">
        <rect x="28" y="0" width="16" height="44" rx="6" fill={`url(#${p}-w)`} />
        <rect x="30" y="-6" width="12" height="9" rx="3" fill="#334155" />
        <rect x="31" y="44" width="10" height="8" rx="2.5" fill="#475569" />
      </g>
      <circle cx="62" cy="61" r="6.5" fill={`url(#${p}-k)`} />
    </Frame>
  ),

  // A magnifier over tissue: biopsy.
  magnifier: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-rim`} from="#94a3b8" to="#334155" />
        <Grad id={`${p}-h`} from="#475569" to="#0f172a" />
        <radialGradient id={`${p}-lens`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#f0f9ff" /><stop offset="1" stopColor="#bae6fd" /></radialGradient>
      </defs>
      <g transform="rotate(45 68 68)"><rect x="61" y="54" width="14" height="34" rx="7" fill={`url(#${p}-h)`} /></g>
      <circle cx="42" cy="42" r="26" fill={`url(#${p}-lens)`} />
      {[[34, 36, 6], [48, 34, 5], [44, 48, 6.5], [32, 50, 4.5], [55, 46, 4]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#f9a8d4" stroke="#db2777" strokeOpacity="0.5" />
      ))}
      <circle cx="42" cy="42" r="26" fill="none" stroke={`url(#${p}-rim)`} strokeWidth="7" />
      <Sheen p={p} cx={32} cy={30} rx={7} ry={4} rotate={-35} opacity={0.8} />
    </Frame>
  ),

  // A flask: molecular / PCR tests.
  flask: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-gl`} from="#ffffff" to="#dbe3ec" x2={1} y2={0} />
        <Grad id={`${p}-liq`} from="#67e8f9" to="#0891b2" />
      </defs>
      <path d="M40 10 V36 L18 76 a7 7 0 0 0 6 10 H72 a7 7 0 0 0 6 -10 L56 36 V10 Z" fill={`url(#${p}-gl)`} stroke="#94a3b8" strokeOpacity="0.5" />
      <path d="M29 58 H67 L76 76 a7 7 0 0 1 -6 9 H26 a7 7 0 0 1 -6 -9 Z" fill={`url(#${p}-liq)`} />
      <rect x="36" y="6" width="24" height="8" rx="3" fill="#cbd5e1" />
      <circle cx="40" cy="72" r="3" fill="#fff" opacity="0.7" />
      <circle cx="52" cy="66" r="2" fill="#fff" opacity="0.6" />
      <circle cx="58" cy="76" r="2.5" fill="#fff" opacity="0.6" />
      <rect x="43" y="14" width="3" height="22" rx="1.5" fill="#fff" opacity="0.9" />
    </Frame>
  ),

  // A DNA double helix: genetics.
  dna: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-a`} from="#93c5fd" to="#2563eb" />
        <Grad id={`${p}-b`} from="#f9a8d4" to="#db2777" />
      </defs>
      {[18, 30, 58, 70].map((y) => (
        <rect key={y} x="38" y={y} width="20" height="3.5" rx="1.75" fill="#cbd5e1" />
      ))}
      <path d="M34 8 C62 20 62 32 34 44 C62 56 62 68 34 82" fill="none" stroke={`url(#${p}-b)`} strokeWidth="7" strokeLinecap="round" />
      <path d="M62 8 C34 20 34 32 62 44 C34 56 34 68 62 82" fill="none" stroke={`url(#${p}-a)`} strokeWidth="7" strokeLinecap="round" />
      <path d="M38 12 C48 16 52 20 54 24" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
    </Frame>
  ),

  // A stethoscope: specialised tests.
  stethoscope: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-st`} from="#f1f5f9" to="#94a3b8" />
        <Grad id={`${p}-tube`} from="#475569" to="#0f172a" />
      </defs>
      <path d="M26 12 V34 C26 50 38 58 48 58 C58 58 70 50 70 34 V12" fill="none" stroke={`url(#${p}-tube)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M48 58 V66 C48 78 58 84 66 80" fill="none" stroke={`url(#${p}-tube)`} strokeWidth="5" strokeLinecap="round" />
      <circle cx="26" cy="11" r="4" fill={`url(#${p}-st)`} />
      <circle cx="70" cy="11" r="4" fill={`url(#${p}-st)`} />
      <circle cx="72" cy="74" r="12" fill={`url(#${p}-st)`} />
      <circle cx="72" cy="74" r="7" fill="#cbd5e1" stroke="#94a3b8" />
      <Sheen p={p} cx={68} cy={69} rx={3.5} ry={2.5} />
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
