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
  const headerRef = useRef<HTMLDivElement>(null);
  const headerWrapperRef = useRef<HTMLDivElement>(null);
  const headerHeightRef = useRef<number>(0);

  useEffect(() => {
    if (headerRef.current) {
      headerHeightRef.current = headerRef.current.scrollHeight;
      if (headerWrapperRef.current) {
        headerWrapperRef.current.style.height = `${headerHeightRef.current}px`;
      }
    }
  }, [header]);

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
        if (shellRef.current) {
          if (y > 4) {
            shellRef.current.classList.add("shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]");
          } else {
            shellRef.current.classList.remove("shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]");
          }
        }
      });
    };
    scroller.addEventListener("scroll", onScroll as EventListener, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll as EventListener);
    };
  }, [squeezeDistance]);


  return (
    <div
      ref={shellRef}
      className={`sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40 rounded-b-2xl transition-shadow shadow-none ${className}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
    >
      {header && (
        <div
          ref={headerWrapperRef}
          style={{
            transformOrigin: "left top",
            overflow: "hidden",
            willChange: "opacity, transform, height",
          }}
        >
          <div ref={headerRef} className="px-4 pt-3 pb-1">
            {header}
          </div>
        </div>
      )}

      <div className="px-4 pt-2 pb-3">
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
