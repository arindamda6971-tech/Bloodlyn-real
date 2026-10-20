import { memo } from "react";

/**
 * Four-step explainer for first-time users, laid out as one horizontal row
 * (Tata 1mg style). Static, no data needed.
 * Icons: Microsoft Fluent Emoji 3D (MIT, see public/icons/3d/LICENSE-fluent-emoji.txt).
 */
const STEPS = [
  { icon: "mobile-phone", title: "Book", text: "online in a minute" },
  { icon: "house", title: "Collect", text: "sample at home" },
  { icon: "test-tube", title: "Test", text: "at a NABL lab" },
  { icon: "page-facing-up", title: "Report", text: "on phone in 6–24h" },
] as const;

const HowItWorks = memo(() => (
  <section className="home-render-section px-4 mt-8" style={{ contain: "content" }}>
    <h2 className="text-[19px] font-extrabold text-foreground tracking-tight mb-4">How it works</h2>
    <ol className="relative grid grid-cols-4 rounded-2xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 px-2 pt-5 pb-4">
      {/* Dotted connector running behind the icon circles */}
      <span
        aria-hidden="true"
        className="absolute left-[12.5%] right-[12.5%] top-[49px] border-t-2 border-dotted border-sky-200"
      />
      {STEPS.map(({ icon, title, text }) => (
        <li key={title} className="relative flex flex-col items-center text-center px-1">
          <span className="w-[60px] h-[60px] rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(2,132,199,0.25)] ring-1 ring-sky-100 flex items-center justify-center">
            <img
              src={`/icons/3d/${icon}.webp`}
              alt=""
              width={34}
              height={34}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="w-[34px] h-[34px] object-contain"
            />
          </span>
          <span className="mt-2.5 text-[13px] font-bold text-foreground leading-tight">{title}</span>
          <span className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{text}</span>
        </li>
      ))}
    </ol>
  </section>
));

HowItWorks.displayName = "HowItWorks";

export default HowItWorks;
