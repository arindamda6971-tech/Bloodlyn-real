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
 * Ultra-premium, consistent page header used across Tests, Orders, Reports & Profile.
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
      className={`relative ${flush ? "-mx-5 -mt-3 -mb-1 pb-2" : "rounded-2xl mb-1 overflow-hidden"}`}
    >
      {/* Layered gradient background — only if not flush (as StickySearch handles it in flush mode) */}
      {!flush && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.08] pointer-events-none`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
          <div className="pointer-events-none absolute -top-8 -right-6 w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500/20 to-transparent blur-2xl" />
          <div className="absolute inset-0 rounded-2xl border border-white/40 dark:border-white/5 pointer-events-none" />
        </>
      )}

      <div className={`relative flex items-center gap-3.5 ${flush ? "px-5 pt-4 pb-2" : "px-3.5 py-3"}`}>
        {/* Icon medallion */}
        <div className="relative shrink-0">
          <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${accent} opacity-70 blur-[6px]`} />
          <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] flex items-center justify-center ring-1 ring-white/30`}>
            <Icon className="w-[22px] h-[22px] text-white" strokeWidth={2.4} />
            <span className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-white/70 blur-[1px]" />
          </div>
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] leading-none font-black tracking-tight text-foreground truncate">
              {title}
            </h1>
            <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${accent} shadow-[0_0_8px_hsl(var(--primary)/0.7)]`} />
          </div>
          {subtitle && (
            <p className="mt-1 text-[11.5px] font-semibold tracking-wide text-muted-foreground/90 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>

      {/* Bottom shimmer line — only in card mode (flush blends instead) */}
      {!flush && (
        <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      )}
    </motion.div>
  );
};

export default PremiumPageHeader;
