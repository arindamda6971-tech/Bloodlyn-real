import { useId, type ReactNode } from "react";

/**
 * Soft-3D illustrations for the "Our services" tiles, in the same style as the
 * health-concern icons: glossy gradients, a highlight on the lit side and a
 * soft floor shadow. SVG, so they are sharp on every phone and need no images.
 */
export type ServiceIllustrationName = "doctor" | "ecg" | "bp" | "physio" | "prescription";

interface Shared {
  /** Unique id prefix, so gradients of different illustrations don't clash. */
  p: string;
}

const Grad = ({ id, from, to, x1 = 0.15, y1 = 0, x2 = 0.85, y2 = 1 }: { id: string; from: string; to: string; x1?: number; y1?: number; x2?: number; y2?: number }) => (
  <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
    <stop offset="0" stopColor={from} />
    <stop offset="1" stopColor={to} />
  </linearGradient>
);

const Frame = ({ p, children, shadow = { cx: 60, rx: 38 } }: Shared & { children: ReactNode; shadow?: { cx: number; rx: number } }) => (
  <>
    <defs>
      <filter id={`${p}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id={`${p}-soft`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </defs>
    <ellipse cx={shadow.cx} cy="111" rx={shadow.rx} ry="5" fill="#0f172a" opacity="0.18" filter={`url(#${p}-blur)`} />
    {children}
  </>
);

const Sheen = ({ p, cx, cy, rx, ry, rotate = 0, opacity = 0.75 }: Shared & { cx: number; cy: number; rx: number; ry: number; rotate?: number; opacity?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={opacity} transform={`rotate(${rotate} ${cx} ${cy})`} filter={`url(#${p}-soft)`} />
);

const ART: Record<ServiceIllustrationName, (props: Shared) => JSX.Element> = {
  // A phone on a video call with a doctor, and a stethoscope.
  doctor: ({ p }) => (
    <Frame p={p}>
      <defs>
        <Grad id={`${p}-body`} from="#475569" to="#0f172a" />
        <Grad id={`${p}-screen`} from="#e0f2fe" to="#a5d8f7" />
        <Grad id={`${p}-skin`} from="#fdd9bd" to="#e9a27a" />
        <Grad id={`${p}-coat`} from="#ffffff" to="#d5dee8" />
        <Grad id={`${p}-hair`} from="#4b3427" to="#22150e" />
        <Grad id={`${p}-steel`} from="#f1f5f9" to="#94a3b8" />
        <Grad id={`${p}-call`} from="#4ade80" to="#16a34a" />
      </defs>
      <g transform="rotate(-8 62 58)">
        <rect x="34" y="8" width="56" height="98" rx="12" fill={`url(#${p}-body)`} />
        <rect x="38" y="14" width="48" height="86" rx="8" fill={`url(#${p}-screen)`} />
        {/* doctor on screen */}
        <path d="M44 100 C44 80 52 71 62 71 C72 71 80 80 80 100 Z" fill={`url(#${p}-coat)`} />
        <path d="M58 72 L62 84 L66 72 Z" fill="#93c5fd" />
        <rect x="58.5" y="64" width="7" height="9" rx="3" fill={`url(#${p}-skin)`} />
        <circle cx="62" cy="54" r="12" fill={`url(#${p}-skin)`} />
        <path d="M50 52 C50 41 57 37 62 37 C70 37 75 42 74 52 C71 46 66 44 62 45 C57 46 53 48 50 52 Z" fill={`url(#${p}-hair)`} />
        <path d="M54 76 C52 84 55 90 60 90" fill="none" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="69" y="80" width="7" height="7" rx="1.5" fill="#ef4444" />
        <rect x="71.6" y="81.5" width="1.8" height="4" fill="#fff" />
        <rect x="70.5" y="82.6" width="4" height="1.8" fill="#fff" />
        {/* live tag and call button */}
        <rect x="42" y="18" width="16" height="7" rx="3.5" fill="#ef4444" />
        <circle cx="45.5" cy="21.5" r="1.4" fill="#fff" />
        <rect x="48" y="20.5" width="7" height="2" rx="1" fill="#fff" />
        <rect x="52" y="92" width="20" height="7" rx="3.5" fill={`url(#${p}-call)`} />
        <rect x="35" y="11" width="6" height="70" rx="3" fill="#fff" opacity="0.12" />
      </g>
      {/* stethoscope */}
      <path d="M22 40 C14 58 18 84 36 92 C46 96 52 92 56 88" fill="none" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M22 40 C22 34 18 30 14 30 M22 40 C22 34 26 30 30 30" fill="none" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="14" cy="30" r="3" fill={`url(#${p}-steel)`} />
      <circle cx="30" cy="30" r="3" fill={`url(#${p}-steel)`} />
      <circle cx="62" cy="88" r="10" fill={`url(#${p}-steel)`} />
      <circle cx="62" cy="88" r="6" fill="#cbd5e1" />
      <Sheen p={p} cx={59} cy={84} rx={3} ry={2} />
    </Frame>
  ),

  // A heart monitor with a trace, and a glossy heart in front.
  ecg: ({ p }) => (
    <Frame p={p} shadow={{ cx: 62, rx: 42 }}>
      <defs>
        <Grad id={`${p}-mon`} from="#f8fafc" to="#cbd5e1" />
        <Grad id={`${p}-scr`} from="#1e293b" to="#0b1220" />
        <Grad id={`${p}-heart`} from="#ff8597" to="#d61f45" />
      </defs>
      <rect x="10" y="14" width="88" height="66" rx="12" fill={`url(#${p}-mon)`} />
      <rect x="16" y="20" width="76" height="48" rx="7" fill={`url(#${p}-scr)`} />
      {[30, 42, 54].map((y) => (
        <line key={y} x1="18" y1={y} x2="90" y2={y} stroke="#22d3ee" strokeOpacity="0.12" />
      ))}
      <path d="M18 46 H32 L36 38 L41 56 L47 28 L52 52 L56 46 H90" fill="none" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="84" y="31" textAnchor="end" fontSize="8" fontWeight="800" fill="#4ade80" fontFamily="system-ui, sans-serif">72</text>
      <rect x="44" y="80" width="20" height="10" fill="#cbd5e1" />
      <rect x="32" y="90" width="44" height="6" rx="3" fill="#94a3b8" />
      <Sheen p={p} cx={22} cy={18} rx={8} ry={2} opacity={0.9} />
      <g transform="translate(58 52)">
        <path d="M28 54 C10 43 4 33 4 25 C4 17 10 11 17 11 C22 11 25 13.5 28 17 C31 13.5 34 11 39 11 C46 11 52 17 52 25 C52 33 46 43 28 54 Z" fill={`url(#${p}-heart)`} />
        <Sheen p={p} cx={15} cy={21} rx={5} ry={3.5} rotate={-30} />
        <path d="M10 31 H19 L22 25 L26 38 L30 28 L33 31 H46" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Frame>
  ),

  // A digital BP monitor with its cuff.
  bp: ({ p }) => (
    <Frame p={p} shadow={{ cx: 58, rx: 44 }}>
      <defs>
        <Grad id={`${p}-case`} from="#ffffff" to="#cfd8e3" />
        <Grad id={`${p}-lcd`} from="#d6f5ec" to="#9fdcc9" />
        <Grad id={`${p}-cuff`} from="#3b6fe0" to="#1e3a8a" />
        <Grad id={`${p}-btn`} from="#60a5fa" to="#1d4ed8" />
      </defs>
      {/* cuff */}
      <g transform="rotate(-12 34 82)">
        <rect x="6" y="66" width="56" height="30" rx="10" fill={`url(#${p}-cuff)`} />
        <rect x="10" y="70" width="48" height="6" rx="3" fill="#fff" opacity="0.18" />
        <rect x="14" y="80" width="22" height="10" rx="3" fill="#93c5fd" opacity="0.5" />
      </g>
      {/* tube */}
      <path d="M50 82 C62 86 66 74 72 70" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      {/* monitor */}
      <rect x="54" y="18" width="58" height="72" rx="13" fill={`url(#${p}-case)`} />
      <rect x="54" y="18" width="58" height="72" rx="13" fill="none" stroke="#94a3b8" strokeOpacity="0.45" />
      <rect x="61" y="25" width="44" height="34" rx="6" fill={`url(#${p}-lcd)`} />
      <text x="83" y="41" textAnchor="middle" fontSize="12" fontWeight="800" fill="#134e4a" fontFamily="system-ui, sans-serif">120</text>
      <text x="83" y="54" textAnchor="middle" fontSize="10" fontWeight="800" fill="#134e4a" fontFamily="system-ui, sans-serif">80</text>
      <path d="M67 31 l2.5 -2.5 2.5 2.5" fill="none" stroke="#e11d48" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="83" cy="74" r="8" fill={`url(#${p}-btn)`} />
      <Sheen p={p} cx={81} cy={71} rx={3} ry={2} />
      <rect x="64" y="70" width="8" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="94" y="70" width="8" height="3" rx="1.5" fill="#cbd5e1" />
      <Sheen p={p} cx={64} cy={24} rx={6} ry={2} opacity={0.9} />
    </Frame>
  ),

  // An exercise ball, a resistance band and a dumbbell.
  physio: ({ p }) => (
    <Frame p={p} shadow={{ cx: 58, rx: 46 }}>
      <defs>
        <radialGradient id={`${p}-ball`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#7ee8d8" />
          <stop offset="0.55" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </radialGradient>
        <Grad id={`${p}-band`} from="#fb9cc0" to="#db2777" />
        <Grad id={`${p}-bell`} from="#64748b" to="#1e293b" />
        <Grad id={`${p}-grip`} from="#e2e8f0" to="#94a3b8" />
      </defs>
      <circle cx="44" cy="62" r="40" fill={`url(#${p}-ball)`} />
      <path d="M8 56 C26 46 62 46 82 58" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M12 78 C30 70 60 70 80 80" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="3" />
      <Sheen p={p} cx={30} cy={40} rx={10} ry={6} rotate={-30} opacity={0.6} />
      {/* band */}
      <path d="M70 34 C88 22 112 30 108 50 C104 70 82 66 78 54" fill="none" stroke={`url(#${p}-band)`} strokeWidth="7" strokeLinecap="round" />
      <path d="M74 32 C88 24 106 30 104 44" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      {/* dumbbell */}
      <g transform="rotate(-18 92 92)">
        <rect x="78" y="88" width="28" height="7" rx="3.5" fill={`url(#${p}-grip)`} />
        <rect x="70" y="80" width="12" height="23" rx="4" fill={`url(#${p}-bell)`} />
        <rect x="102" y="80" width="12" height="23" rx="4" fill={`url(#${p}-bell)`} />
        <rect x="72" y="82" width="3" height="18" rx="1.5" fill="#fff" opacity="0.25" />
        <rect x="104" y="82" width="3" height="18" rx="1.5" fill="#fff" opacity="0.25" />
      </g>
    </Frame>
  ),

  // A prescription sheet with an upload badge.
  prescription: ({ p }) => (
    <Frame p={p} shadow={{ cx: 58, rx: 36 }}>
      <defs>
        <Grad id={`${p}-paper`} from="#ffffff" to="#e2e8f0" />
        <Grad id={`${p}-head`} from="#60a5fa" to="#2563eb" />
        <Grad id={`${p}-up`} from="#38bdf8" to="#0369a1" />
      </defs>
      <g transform="rotate(-6 54 58)">
        <rect x="26" y="10" width="62" height="88" rx="9" fill={`url(#${p}-paper)`} />
        <rect x="26" y="10" width="62" height="88" rx="9" fill="none" stroke="#94a3b8" strokeOpacity="0.4" />
        <path d="M26 19 a9 9 0 0 1 9 -9 H79 a9 9 0 0 1 9 9 V24 H26 Z" fill={`url(#${p}-head)`} />
        <text x="34" y="44" fontSize="16" fontWeight="900" fill="#1d4ed8" fontFamily="Georgia, serif">Rx</text>
        {[54, 62, 70, 78].map((y, i) => (
          <rect key={y} x="34" y={y} width={i % 2 ? 34 : 46} height="3.5" rx="1.75" fill="#cbd5e1" />
        ))}
        <path d="M58 88 c4 -6 8 4 12 -2 s6 2 8 0" fill="none" stroke="#1e3a8a" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="88" cy="82" r="18" fill={`url(#${p}-up)`} />
      <Sheen p={p} cx={82} cy={74} rx={6} ry={3.5} rotate={-25} opacity={0.5} />
      <path d="M88 92 V74 M80 81 L88 73 L96 81" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
};

export function ServiceIllustration({ name, className }: { name: ServiceIllustrationName; className?: string }) {
  const p = `sv${useId().replace(/:/g, "")}`;
  const Art = ART[name];
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false">
      <Art p={p} />
    </svg>
  );
}
