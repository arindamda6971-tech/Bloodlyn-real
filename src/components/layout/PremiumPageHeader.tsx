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
    <div
      className={`relative ${flush ? "-mx-5 -mt-3 -mb-1 pb-2" : "rounded-2xl mb-2 bg-card border-none shadow-none"}`}
    >
      <div className={`relative flex items-center gap-3 ${flush ? "px-5 pt-4 pb-2" : "px-4 py-4"}`}>
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl leading-none font-bold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
};

export default PremiumPageHeader;
