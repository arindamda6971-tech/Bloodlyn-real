import { ReactNode, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";

interface StickySearchProps {
  /** Controlled input value */
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Optional header content that squeezes / fades on scroll (title row, chips, etc) */
  header?: ReactNode;
  /** Optional element rendered BELOW the search input but still inside the sticky shell (e.g. filter chips) */
  footer?: ReactNode;
  /** Dropdown / results portal rendered absolutely below the input */
  results?: ReactNode;
  /** Scroll distance over which the header squeezes (px) */
  squeezeDistance?: number;
  className?: string;
  onClear?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rightSlot?: ReactNode;
}

/**
 * Industry-standard sticky search bar with a "squeeze" animation:
 * - When the user scrolls inside the nearest `overflow-y-auto` ancestor, the
 *   `header` slot smoothly collapses (height + opacity + scale) and the search
 *   input rises into the visible chrome.
 * - GPU-only transforms + opacity → 60fps on mobile.
 * - Works inside MobileLayout's PullToRefresh container (no dependency on window scroll).
 */
const StickySearch = ({
  value,
  onChange,
  placeholder = "Search...",
  header,
  footer,
  results,
  squeezeDistance = 80,
  className = "",
  onClear,
  onFocus,
  onKeyDown,
  rightSlot,
}: StickySearchProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0 → expanded, 1 → squeezed

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    // Find nearest scrollable ancestor
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const oy = style.overflowY;
      if (oy === "auto" || oy === "scroll") {
        break;
      }
      parent = parent.parentElement;
    }
    const scroller: HTMLElement | Window = parent || window;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y =
          scroller === window
            ? window.scrollY
            : (scroller as HTMLElement).scrollTop;
        const p = Math.min(1, Math.max(0, y / squeezeDistance));
        setProgress(p);
      });
    };
    scroller.addEventListener("scroll", onScroll as EventListener, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll as EventListener);
    };
  }, [squeezeDistance]);

  // Animation tokens derived from scroll progress
  const headerOpacity = 1 - progress;
  const headerScale = 1 - progress * 0.15;
  const headerMaxHeight = header ? (1 - progress) * 200 : 0; // collapse smoothly
  const shellShadow = progress > 0.05 ? "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]" : "shadow-none";

  return (
    <div
      ref={shellRef}
      className={`sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40 transition-shadow ${shellShadow} ${className}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
    >
      {header && (
        <div
          style={{
            opacity: headerOpacity,
            transform: `scale(${headerScale})`,
            transformOrigin: "left top",
            maxHeight: headerMaxHeight,
            overflow: "hidden",
            transition: "opacity 80ms linear, transform 80ms linear, max-height 120ms ease-out",
            willChange: "opacity, transform, max-height",
          }}
          className="px-4 pt-3"
        >
          {header}
        </div>
      )}

      <div className="px-4 pt-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            className="w-full h-11 rounded-xl bg-muted/60 border border-border/60 pl-10 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-all text-foreground placeholder:text-muted-foreground"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {rightSlot && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">{rightSlot}</div>
          )}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 top-full mt-2 z-50"
            >
              {results}
            </motion.div>
          )}
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
};

export default StickySearch;
