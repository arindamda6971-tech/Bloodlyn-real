import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, ShieldCheck, Truck } from "lucide-react";

const NAVY = "#0B2545";
const BLUE = "#1D6FE0";

const FEATURES = [
  { Icon: Truck, lines: ["Home", "Sample Collection"] },
  { Icon: ShieldCheck, lines: ["NABL Certified", "Labs"] },
  { Icon: Clock, lines: ["Quick & Accurate", "Reports"] },
];

/**
 * Drawn as one SVG so the text, button and icons stay sharp on every screen.
 * Only the doctor is a photo (hero-doctor.webp); the old banner had all the text
 * baked into a small, heavily compressed image, which looked blurry and washed out.
 */
const TakeChargeBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 mt-4">
      <div
        onClick={() => navigate("/categories")}
        className="relative w-full rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer active:scale-[0.98] transition-transform duration-150"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate("/categories");
          }
        }}
        aria-label="Book a Test - Explore Tests"
      >
        <svg viewBox="0 0 1024 382" className="block w-full h-auto select-none" aria-hidden="true">
          <defs>
            {/* Matches the photo's own background so there's no seam around it. */}
            <linearGradient id="tcb-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E7F8FF" />
              <stop offset="0.6" stopColor="#DBF3FF" />
              <stop offset="1" stopColor="#CEF0FE" />
            </linearGradient>
            {/* Fades the photo's left and right edges into the drawn background. */}
            <linearGradient id="tcb-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.1" stopColor="#fff" />
              <stop offset="0.9" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="tcb-photo-mask" maskUnits="userSpaceOnUse" x="425" y="0" width="360" height="382">
              <rect x="425" y="0" width="360" height="382" fill="url(#tcb-fade)" />
            </mask>
          </defs>

          <rect width="1024" height="382" fill="url(#tcb-bg)" />
          <circle cx="18" cy="-6" r="74" fill="#C6E8FB" />
          <circle cx="1010" cy="4" r="84" fill="#C6E8FB" />
          <g fill="#A9D2F3" opacity="0.7">
            <ellipse cx="22" cy="330" rx="20" ry="58" transform="rotate(-18 22 330)" />
            <ellipse cx="62" cy="352" rx="16" ry="44" transform="rotate(32 62 352)" />
          </g>
          <g fill="#B5D3F2">
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <circle key={`${row}-${col}`} cx={938 + col * 18} cy={312 + row * 15} r="2.6" />
              ))
            )}
          </g>

          <image
            href="/hero-doctor.webp"
            x="425"
            y="0"
            width="360"
            height="382"
            preserveAspectRatio="xMidYMid slice"
            mask="url(#tcb-photo-mask)"
          />

          <g stroke="#22A99A" strokeWidth="4" strokeLinecap="round">
            <line x1="392" y1="104" x2="412" y2="96" />
            <line x1="398" y1="88" x2="412" y2="74" />
            <line x1="414" y1="96" x2="420" y2="78" />
          </g>

          <text x="64" y="124" fill={NAVY} fontSize="46" fontWeight="800" letterSpacing="-0.5">
            Take Charge
          </text>
          <text x="64" y="178" fill={NAVY} fontSize="46" fontWeight="800" letterSpacing="-0.5">
            of Your Health
          </text>
          <text x="66" y="214" fill="#475569" fontSize="19" fontWeight="500">
            Accurate. Affordable. At Your Doorstep.
          </text>

          <rect x="66" y="236" width="236" height="56" rx="18" fill={NAVY} />
          <text x="100" y="271" fill="#fff" fontSize="20" fontWeight="700">
            Book a Test
          </text>
          <ArrowRight x="244" y="252" width="24" height="24" color="#fff" strokeWidth={2.4} />

          {FEATURES.map(({ Icon, lines }, i) => {
            const cy = 96 + i * 82;
            return (
              <g key={lines[0]}>
                <circle cx="822" cy={cy} r="32" fill="#fff" stroke="#D3E5F8" strokeWidth="2" />
                <Icon x="806" y={cy - 16} width="32" height="32" color={BLUE} strokeWidth={2} />
                <text x="868" y={cy - 4} fill={NAVY} fontSize="15.5" fontWeight="600">
                  {lines[0]}
                </text>
                <text x="868" y={cy + 16} fill={NAVY} fontSize="15.5" fontWeight="600">
                  {lines[1]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default TakeChargeBanner;
