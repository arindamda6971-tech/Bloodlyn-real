import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarCheck, Check, FileText, HeartPulse, Home, Stethoscope, TestTube } from "lucide-react";
import { BOOKING_BUTTON_BG, BRAND_BLUE } from "@/lib/booking-theme";

/**
 * Intro screen, shown once before login: BloodLyn logo, a blood drop with a slow
 * orbit of service icons, welcome copy and the Get started / Log in actions.
 * Motion is CSS only (transform/opacity, see `.onb-*` in index.css), so it stays
 * smooth on low-end phones and switches off with "reduce motion".
 */

const ORBIT_ICONS = [TestTube, Stethoscope, HeartPulse, FileText, Home, CalendarCheck];
const ORBIT_SIZE = 260;
const ORBIT_RADIUS = ORBIT_SIZE / 2;
const ICON_SIZE = 44;

const TRUST_POINTS = ["Home sample collection", "Verified partner labs", "Reports on your phone"];

const rise = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` });

const BloodDrop = () => (
  <svg width="92" height="120" viewBox="0 0 100 130" aria-hidden className="drop-shadow-[0_12px_22px_rgba(220,16,30,0.38)]">
    <defs>
      <linearGradient id="onbDropFill" x1="0.2" y1="0" x2="0.55" y2="1">
        <stop offset="0%" stopColor="#FF4B55" />
        <stop offset="45%" stopColor="#EC0F1E" />
        <stop offset="100%" stopColor="#B4000E" />
      </linearGradient>
      <radialGradient id="onbDropShine" cx="0.34" cy="0.3" r="0.42">
        <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
    <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#onbDropFill)" />
    <path d="M50 8 C50 8, 88 55, 88 80 C88 101, 71 120, 50 120 C29 120, 12 101, 12 80 C12 55, 50 8, 50 8Z" fill="url(#onbDropShine)" />
    <polyline
      className="onb-ecg"
      pathLength={100}
      points="18,82 30,82 36,68 42,95 48,60 54,95 60,75 66,82 82,82"
      fill="none"
      stroke="rgba(255,255,255,0.92)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const OnboardingScreen = () => {
  const navigate = useNavigate();

  const finish = (signUp: boolean) => {
    try { localStorage.setItem("bloodlyn-onboarded", "1"); } catch { /* ignore */ }
    navigate("/login", { state: { signUp } });
  };

  return (
    <div
      className="h-[100dvh] w-full md:max-w-[430px] mx-auto flex flex-col overflow-y-auto overflow-x-hidden bg-white"
      style={{
        WebkitOverflowScrolling: "touch",
        backgroundImage: "radial-gradient(90% 40% at 50% 0%, rgba(8, 65, 212, 0.07), transparent 70%)",
      }}
    >
      <div className="flex min-h-full flex-1 flex-col px-6 pt-[calc(var(--sat,0px)+28px)] pb-[calc(var(--sab,0px)+24px)]">
        <img
          src="/assets/images/logo-full.png"
          alt="BloodLyn"
          width={260}
          height={70}
          className="onb-rise mx-auto h-[52px] w-auto object-contain"
          style={rise(0)}
        />

        <div className="min-h-[24px] max-h-[56px] flex-1" />

        {/* Drop with an orbit of services */}
        <div className="onb-rise relative mx-auto shrink-0" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE, ...rise(90) }}>
          <div className="absolute inset-0 rounded-full border border-slate-200/80" />
          <div className="absolute inset-[42px] rounded-full border border-dashed border-slate-200" />
          <div className="onb-glow absolute inset-[66px] rounded-full" style={{ background: "radial-gradient(circle, rgba(236, 15, 30, 0.2), transparent 70%)" }} />

          <div className="onb-orbit absolute inset-0">
            {ORBIT_ICONS.map((Icon, i) => {
              const angle = (i / ORBIT_ICONS.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <span
                  key={i}
                  className="absolute"
                  style={{
                    left: ORBIT_RADIUS + Math.cos(angle) * ORBIT_RADIUS - ICON_SIZE / 2,
                    top: ORBIT_RADIUS + Math.sin(angle) * ORBIT_RADIUS - ICON_SIZE / 2,
                  }}
                >
                  <span
                    className="onb-counter flex items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.25)] ring-1 ring-slate-100"
                    style={{ width: ICON_SIZE, height: ICON_SIZE }}
                  >
                    <Icon className="h-5 w-5" style={{ color: BRAND_BLUE }} />
                  </span>
                </span>
              );
            })}
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="onb-beat">
              <BloodDrop />
            </div>
          </div>
        </div>

        {/* Copy */}
        <p className="onb-rise mt-9 text-center text-[13px] font-semibold" style={{ color: BRAND_BLUE, ...rise(170) }}>
          Welcome to BloodLyn
        </p>
        <h1 className="onb-rise mt-1 text-center text-[28px] font-bold leading-tight tracking-tight text-slate-900" style={rise(210)}>
          Your health, our priority
        </h1>
        <p className="onb-rise mx-auto mt-2 max-w-[310px] text-center text-[14px] leading-relaxed text-slate-500" style={rise(250)}>
          Book lab tests and get your sample collected at home. Reports come straight to your phone.
        </p>
        <ul className="onb-rise mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] font-medium text-slate-500" style={rise(290)}>
          {TRUST_POINTS.map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" style={{ color: BRAND_BLUE }} strokeWidth={3} />
              {point}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="onb-rise mt-auto pt-7" style={rise(340)}>
          <button
            type="button"
            onClick={() => finish(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
            style={BOOKING_BUTTON_BG}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-center text-[13px] text-slate-500">
            Already have an account?{" "}
            <button type="button" onClick={() => finish(false)} className="font-semibold" style={{ color: BRAND_BLUE }}>
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
