import type { CSSProperties } from "react";

/**
 * Brand blue taken from the "Lyn" wordmark in /assets/images/logo-full.png.
 * The logo runs top to bottom from sky blue to royal blue. These are its sampled stops
 * (#0AB6FE, #038DFC, #0450F7), each made about 6% deeper so white text sits better on them.
 */
export const LOGO_BLUE_TOP = "#05A2E6";
export const LOGO_BLUE_MID = "#0474DC";
export const LOGO_BLUE_DEEP = "#0841D4";

/** Solid brand blue for icons, ticks and links on white. */
export const BRAND_BLUE = LOGO_BLUE_DEEP;

const LOGO_GRADIENT = `${LOGO_BLUE_TOP} 0%, ${LOGO_BLUE_MID} 48%, ${LOGO_BLUE_DEEP} 100%`;

export const BOOKING_HERO_BG: CSSProperties = {
  background: [
    "radial-gradient(110% 70% at 90% 0%, rgba(255, 255, 255, 0.16) 0%, transparent 55%)",
    `linear-gradient(165deg, ${LOGO_GRADIENT})`,
  ].join(", "),
};

export const BOOKING_BUTTON_BG: CSSProperties = {
  background: `linear-gradient(180deg, ${LOGO_GRADIENT})`,
  boxShadow: "0 12px 28px -12px rgba(8, 65, 212, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
};
