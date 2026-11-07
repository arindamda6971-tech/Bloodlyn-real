import { motion } from "framer-motion";
import { BRAND_BLUE } from "@/lib/booking-theme";

/** Soft circles that give the gradient some depth. */
export const HeroDecor = ({ drift = false }: { drift?: boolean }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <motion.div
      className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/[0.06]"
      animate={drift ? { x: [0, -16, 0], y: [0, 12, 0] } : undefined}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -right-6 top-28 h-36 w-36 rounded-full bg-white/[0.05]"
      animate={drift ? { x: [0, 10, 0], y: [0, -10, 0] } : undefined}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/[0.04]"
      animate={drift ? { x: [0, 14, 0] } : undefined}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/** White disc with a brand check that draws itself. */
export const HeroCheck = ({ size = 56 }: { size?: number }) => (
  <motion.div
    className="relative flex items-center justify-center rounded-full bg-white shadow-lg ring-8 ring-white/15"
    style={{ width: size, height: size }}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 260, damping: 17 }}
  >
    <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" aria-hidden>
      <motion.path
        d="M5 12.5l4.2 4.2L19 7"
        stroke={BRAND_BLUE}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
      />
    </svg>
  </motion.div>
);
