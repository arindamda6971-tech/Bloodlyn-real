import type { CSSProperties } from "react";

/**
 * Premium sapphire palette for the order-processing and order-placed screens:
 * a deep midnight blue with a soft light source top-right, instead of flat sky blue.
 */
export const SAPPHIRE = "hsl(222 70% 40%)";

export const BOOKING_HERO_BG: CSSProperties = {
  background: [
    "radial-gradient(110% 70% at 90% 0%, hsl(214 85% 55% / 0.38) 0%, transparent 60%)",
    "radial-gradient(70% 50% at 0% 100%, hsl(226 70% 45% / 0.18) 0%, transparent 70%)",
    "linear-gradient(160deg, hsl(221 68% 27%) 0%, hsl(225 63% 17%) 55%, hsl(229 58% 10%) 100%)",
  ].join(", "),
};

export const BOOKING_BUTTON_BG: CSSProperties = {
  background: "linear-gradient(135deg, hsl(220 72% 40%) 0%, hsl(225 66% 25%) 100%)",
  boxShadow: "0 12px 28px -14px hsl(224 70% 25% / 0.8), inset 0 1px 0 hsl(0 0% 100% / 0.12)",
};
