import { useNavigate } from "react-router-dom";

const OnboardingScreen = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    try { localStorage.setItem("bloodlyn-onboarded", "1"); } catch { /* ignore */ }
    navigate("/login");
  };

  return (
    <div
      className="h-[100dvh] w-full md:max-w-[430px] mx-auto flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #4338ca 0%, #5b50e6 100%)' }}
    >
      {/* ── PURPLE HEADER ── */}
      <div className="shrink-0 flex flex-col items-center pt-16 pb-5">
        <div className="flex items-center gap-2.5 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span className="text-[26px] font-bold text-white tracking-tight">BloodLyn</span>
        </div>
        <div className="flex gap-2 justify-center">
          <div className="w-5 h-1.5 rounded-full bg-white"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
        </div>
      </div>

      {/* ── WHITE CARD ── */}
      <div
        className="flex-1 bg-white rounded-t-[2rem] overflow-y-auto overscroll-y-none min-h-0 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-7 pt-6 pb-8 flex flex-col items-center h-full">

          {/* ── GRAPHIC AREA ── */}
          <div className="relative w-[280px] h-[260px] mx-auto mb-2">
            {/* Dotted connecting circle */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 260">
              <ellipse cx="140" cy="130" rx="110" ry="100" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
              {/* Small decorative dots on the circle path */}
              <circle cx="140" cy="30" r="2.5" fill="#c7d2fe" />
              <circle cx="235" cy="75" r="2.5" fill="#c7d2fe" />
              <circle cx="235" cy="185" r="2.5" fill="#c7d2fe" />
              <circle cx="45" cy="185" r="2.5" fill="#c7d2fe" />
              <circle cx="45" cy="75" r="2.5" fill="#c7d2fe" />
              {/* Connecting lines from icons toward center */}
              <line x1="140" y1="30" x2="140" y2="70" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="235" y1="75" x2="195" y2="100" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="235" y1="185" x2="195" y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="185" x2="85" y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="75" x2="85" y2="100" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* 3D Blood Drop - SVG with gradients */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                {/* Soft glow behind */}
                <div className="absolute -inset-4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)' }} />
                {/* Drop shadow on ground */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.25) 0%, transparent 70%)' }} />
                <svg width="100" height="130" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_6px_20px_rgba(239,68,68,0.35)]">
                  <defs>
                    <linearGradient id="dropGrad" x1="0" y1="0" x2="0.3" y2="1">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="30%" stopColor="#f87171" />
                      <stop offset="60%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    <radialGradient id="dropShine" cx="0.35" cy="0.3" r="0.5">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                  </defs>
                  {/* Main drop shape */}
                  <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#dropGrad)" />
                  {/* Glossy highlight */}
                  <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#dropShine)" />
                  {/* Small specular highlight */}
                  <ellipse cx="38" cy="50" rx="12" ry="18" fill="rgba(255,255,255,0.2)" transform="rotate(-15 38 50)" />
                  {/* ECG Line */}
                  <polyline points="18,82 30,82 36,68 42,95 48,60 54,95 60,75 66,82 82,82" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* ── Surrounding Icon Bubbles ── */}
            {/* Top - Test tube */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] rounded-full bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100/50 z-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" /><path d="M8.5 2h7" /><path d="M14.5 16h-5" />
              </svg>
            </div>

            {/* Top Right - Heart */}
            <div className="absolute top-[50px] right-0 w-[44px] h-[44px] rounded-full bg-rose-50 flex items-center justify-center shadow-sm border border-rose-100/50 z-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>

            {/* Bottom Right - Clipboard */}
            <div className="absolute bottom-[20px] right-0 w-[44px] h-[44px] rounded-full bg-purple-50 flex items-center justify-center shadow-sm border border-purple-100/50 z-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 14h6" /><path d="M9 18h6" /><path d="M9 10h6" />
              </svg>
            </div>

            {/* Bottom Left - Shield/Plus */}
            <div className="absolute bottom-[20px] left-0 w-[44px] h-[44px] rounded-full bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100/50 z-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
              </svg>
            </div>

            {/* Top Left - Stethoscope */}
            <div className="absolute top-[50px] left-0 w-[44px] h-[44px] rounded-full bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100/50 z-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" />
              </svg>
            </div>
          </div>

          {/* ── Text ── */}
          <p className="text-[13px] text-gray-400 font-medium mb-1">Welcome to BloodLyn</p>
          <h2 className="text-[22px] font-extrabold text-gray-900 text-center mb-3">
            Your Health, Our Priority
          </h2>
          <p className="text-[14px] text-gray-400 text-center leading-relaxed mb-8 max-w-[300px]">
            Book lab tests, consult doctors, and get healthcare services at your doorstep.
          </p>

          {/* ── Get Started Button ── */}
          <div className="w-full mt-auto">
            <button
              onClick={handleNext}
              className="w-full h-[52px] rounded-2xl text-white font-bold text-[16px] shadow-lg transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg, #4338ca 0%, #c084fc 100%)' }}
            >
              Get Started
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
