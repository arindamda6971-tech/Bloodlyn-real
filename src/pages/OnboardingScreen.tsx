import { useNavigate } from "react-router-dom";

/**
 * Intro screen — shown once, before the login screen.
 * Clean white sheet: BloodLyn wordmark logo, orbit health graphic,
 * welcome copy and a single "Get Started" CTA.
 */
const OnboardingScreen = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    try { localStorage.setItem("bloodlyn-onboarded", "1"); } catch { /* ignore */ }
    navigate("/login");
  };

  return (
    <div className="h-[100dvh] w-full md:max-w-[430px] mx-auto bg-white flex flex-col overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="flex-1 flex flex-col items-center px-7 pt-[calc(var(--sat,0px)+28px)] pb-8 min-h-full">

        {/* ── LOGO ── */}
        <img
          src="/assets/images/logo-full.png"
          alt="BloodLyn"
          width={260}
          height={70}
          className="h-[64px] w-auto object-contain"
        />

        {/* Spacer to push content lower */}
        <div className="flex-1 min-h-[40px] max-h-[100px]" />

        {/* ── GRAPHIC AREA ── */}
        <div className="relative w-[280px] h-[250px] mx-auto">
          {/* Dotted connecting circle */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 250" aria-hidden="true">
            <ellipse cx="140" cy="125" rx="108" ry="96" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="140" cy="29" r="2.5" fill="#bae6fd" />
            <circle cx="234" cy="72" r="2.5" fill="#bae6fd" />
            <circle cx="234" cy="178" r="2.5" fill="#bae6fd" />
            <circle cx="46" cy="178" r="2.5" fill="#bae6fd" />
            <circle cx="46" cy="72" r="2.5" fill="#bae6fd" />
            <line x1="140" y1="29" x2="140" y2="66" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="234" y1="72" x2="194" y2="97" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="234" y1="178" x2="194" y2="155" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="46" y1="178" x2="86" y2="155" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="46" y1="72" x2="86" y2="97" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
          </svg>

          {/* 3D Blood Drop */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="absolute -inset-5 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)" }} />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.22) 0%, transparent 70%)" }} />
              <svg width="100" height="130" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_6px_20px_rgba(239,68,68,0.3)]" aria-hidden="true">
                <defs>
                  <linearGradient id="introDropGrad" x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0%" stopColor="#fca5a5" />
                    <stop offset="30%" stopColor="#f87171" />
                    <stop offset="60%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  <radialGradient id="introDropShine" cx="0.35" cy="0.3" r="0.5">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>
                <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#introDropGrad)" />
                <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#introDropShine)" />
                <ellipse cx="38" cy="50" rx="12" ry="18" fill="rgba(255,255,255,0.2)" transform="rotate(-15 38 50)" />
                <polyline points="18,82 30,82 36,68 42,95 48,60 54,95 60,75 66,82 82,82" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Orbit bubbles */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[44px] h-[44px] rounded-full bg-sky-50 flex items-center justify-center shadow-sm border border-sky-100/60 z-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" /><path d="M8.5 2h7" /><path d="M14.5 16h-5" />
            </svg>
          </div>
          <div className="absolute top-[50px] right-0 w-[44px] h-[44px] rounded-full bg-rose-50 flex items-center justify-center shadow-sm border border-rose-100/60 z-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div className="absolute bottom-[16px] right-0 w-[44px] h-[44px] rounded-full bg-red-50 flex items-center justify-center shadow-sm border border-red-100/60 z-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 14h6" /><path d="M9 18h6" /><path d="M9 10h6" />
            </svg>
          </div>
          <div className="absolute bottom-[16px] left-0 w-[44px] h-[44px] rounded-full bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100/60 z-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
            </svg>
          </div>
          <div className="absolute top-[50px] left-0 w-[44px] h-[44px] rounded-full bg-sky-50 flex items-center justify-center shadow-sm border border-sky-100/60 z-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" />
            </svg>
          </div>
        </div>

        {/* ── TEXT ── */}
        <p className="text-[13px] text-gray-400 font-medium mt-8 mb-1">Welcome to BloodLyn</p>
        <h1 className="text-[22px] font-extrabold text-gray-900 text-center mb-3">
          Your Health, Our Priority
        </h1>
        <p className="text-[14px] text-gray-400 text-center leading-relaxed max-w-[300px]">
          Book lab tests, consult doctors, and get healthcare services at your doorstep.
        </p>

        {/* ── CTA ── */}
        <div className="w-full mt-auto pt-8">
          <button
            onClick={handleNext}
            className="w-full h-[54px] rounded-full text-white font-bold text-[16px] shadow-lg transition-transform active:scale-[0.98]"
            style={{ background: "var(--gradient-brand)" }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
