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
  /** Optional small chip rendered next to the title. */
  badgeText?: string;
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
  badgeText,
  flush = false,
}: PremiumPageHeaderProps) => {
  return (
    <div
      className={`relative ${flush ? "-mx-5 -mt-2 mb-0 pb-1" : "py-1 mb-1 bg-transparent border-none shadow-none"}`}
    >
      <div className="relative flex items-center gap-2.5 px-1 py-1">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs font-medium text-muted-foreground truncate leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {badgeText && (
          <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {badgeText}
          </span>
        )}

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
};

export default PremiumPageHeader;
