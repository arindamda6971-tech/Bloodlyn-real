import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PremiumPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  /** Tailwind gradient classes, e.g. "from-primary via-primary to-blue-600" */
  accent?: string;
  rightSlot?: ReactNode;
  /** When true, removes card chrome (rounded, border, margin) so it blends
   *  seamlessly with a sibling search bar inside the same sticky shell. */
  flush?: boolean;
}

/**
 * Ultra-premium, senior-engineered page header used across Tests, Orders, Reports & Profile.
 * Designed to live inside <StickySearch header={...}> or stand alone.
 */
const PremiumPageHeader = ({
  title,
  subtitle,
  icon: Icon,
  accent = "from-primary via-primary to-blue-600",
  rightSlot,
  flush = false,
}: PremiumPageHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative ${flush ? "-mx-5 -mt-3 -mb-1 pb-2" : "rounded-3xl mb-1 overflow-hidden bg-card/85 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)]"}`}
    >
      {/* Layered ambient gradient glow background */}
      {!flush && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.06] pointer-events-none`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_65%)] pointer-events-none" />
          <div className="pointer-events-none absolute -top-8 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-gradient-to-tr from-blue-500/15 to-transparent blur-2xl" />
        </>
      )}

      <div className={`relative flex items-center gap-3.5 ${flush ? "px-5 pt-4 pb-2" : "px-4 py-3.5"}`}>
        {/* 3D Icon Medallion with Ambient Glow & Specular Highlight */}
        <div className="relative shrink-0 group">
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${accent} opacity-50 blur-md group-hover:opacity-80 transition-opacity`} />
          <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25)] flex items-center justify-center ring-2 ring-white/50 dark:ring-white/10 active:scale-95 transition-transform`}>
            <Icon className="w-[22px] h-[22px] text-white drop-shadow-sm" strokeWidth={2.4} />
            <span className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-white/70 blur-[1px]" />
          </div>
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[21px] sm:text-[23px] leading-none font-black tracking-tight text-foreground/95 truncate">
              {title}
            </h1>
            <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${accent} shadow-[0_0_8px_hsl(var(--primary)/0.7)] shrink-0`} />
          </div>
          {subtitle && (
            <p className="mt-1 text-[11.5px] font-semibold tracking-wide text-muted-foreground/80 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </motion.div>
  );
};

export default PremiumPageHeader;
