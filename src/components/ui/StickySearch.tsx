import { ReactNode, useEffect, useRef } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { motion } from "framer-motion";

interface StickySearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  header?: ReactNode;
  footer?: ReactNode;
  results?: ReactNode;
  className?: string;
  onClear?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rightSlot?: ReactNode;
  /** When set, a back arrow replaces the search icon (search mode). */
  onBack?: () => void;
  /** Optional accent tint token (visual only). */
  accent?: string;
}

const SHADOW_CLASS = "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]";
const SHADOW_ON = 8;
const SHADOW_OFF = 2;

/**
 * Standard Sticky Search Component.
 * Optimized for native safe-areas and smooth transitions.
 * Purely CSS-driven stickiness for 60fps scroll performance.
 */
const StickySearch = ({
  value,
  onChange,
  placeholder = "Search...",
  header,
  footer,
  results,
  className = "",
  onClear,
  onFocus,
  onKeyDown,
  rightSlot,
  onBack,
}: StickySearchProps) => {
  const shellRef = useRef<HTMLDivElement>(null);

  // Elevation-on-scroll with hysteresis, written straight to the DOM inside a
  // single rAF so scrolling never triggers a React re-render.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    let scroller: HTMLElement | Window = shell.closest<HTMLElement>("[data-scroll-container]") || window;
    if (scroller === window) {
      let node: HTMLElement | null = shell.parentElement;
      while (node) {
        const overflowY = getComputedStyle(node).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          scroller = node;
          break;
        }
        node = node.parentElement;
      }
    }

    let on = false;
    let pending = false;
    let frame = 0;

    const apply = () => {
      pending = false;
      const y = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
      if (!on && y > SHADOW_ON) {
        on = true;
        shell.classList.add(SHADOW_CLASS);
      } else if (on && y <= SHADOW_OFF) {
        on = false;
        shell.classList.remove(SHADOW_CLASS);
      }
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      frame = requestAnimationFrame(apply);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`sticky top-0 z-40 bg-background/95 backdrop-blur-sm transition-shadow duration-200 overflow-visible ${className}`}
      data-testid="sticky-search-shell"
    >
      {header && <div className="px-4 pt-2 pb-0">{header}</div>}

      <div className={`px-4 ${header ? "pt-1" : "pt-2"} pb-2.5`}>
        <div className="relative">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Close search"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-foreground active:bg-muted/60"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60 pointer-events-none" />
          )}
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            className="w-full h-12 rounded-2xl bg-white border-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] pl-11 pr-11 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
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
