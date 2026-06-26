import { ReactNode, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";

interface StickySearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  header?: ReactNode;
  footer?: ReactNode;
  results?: ReactNode;
  squeezeDistance?: number;
  className?: string;
  onClear?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rightSlot?: ReactNode;
  /** Accent gradient classes for continuous premium layout */
  accent?: string;
}

const SHADOW_CLASS = "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]";
const THRESHOLD_ON = 8;
const THRESHOLD_OFF = 2;

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
  accent,
}: StickySearchProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerWrapperRef = useRef<HTMLDivElement>(null);
  const headerHeightRef = useRef<number>(0);

  // (removed dev render counter — was spamming console on every parent re-render)

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

    const mql =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const reducedMotion = mql?.matches || false;

    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const oy = style.overflowY;
      if (oy === "auto" || oy === "scroll") break;
      parent = parent.parentElement;
    }
    const scroller: HTMLElement | Window = parent || window;

    let raf = 0;
    let ticking = false;
    let hasShadow = false;
    let hidden = false;
    let lastY =
      scroller === window
        ? window.scrollY
        : (scroller as HTMLElement).scrollTop;
    let accumulatedDelta = 0;
    const HIDE_AFTER = 80; // start hiding only after scrolling past this
    const THRESHOLD = 20; // pixels of continuous scroll needed to trigger

    const apply = () => {
      ticking = false;
      const y =
        scroller === window
          ? window.scrollY
          : (scroller as HTMLElement).scrollTop;
      const node = shellRef.current;
      if (!node) return;

      // Handle overscroll (rubber-banding on iOS)
      if (y < 0) {
        if (hidden) {
          hidden = false;
          node.style.transform = "translate3d(0, 0, 0)";
        }
        accumulatedDelta = 0;
        lastY = y;
        return;
      }

      // Shadow (hysteresis)
      const nextShadow = hasShadow ? y > THRESHOLD_OFF : y > THRESHOLD_ON;
      if (nextShadow !== hasShadow) {
        hasShadow = nextShadow;
        if (nextShadow) node.classList.add(SHADOW_CLASS);
        else node.classList.remove(SHADOW_CLASS);
      }

      // True hysteresis: accumulate scroll distance in the same direction
      const diff = y - lastY;
      lastY = y;

      if ((diff > 0 && accumulatedDelta > 0) || (diff < 0 && accumulatedDelta < 0)) {
        accumulatedDelta += diff;
      } else {
        accumulatedDelta = diff; // Direction reversed, reset accumulation
      }

      if (Math.abs(accumulatedDelta) > THRESHOLD) {
        let nextHidden = hidden;
        if (accumulatedDelta > 0 && y > HIDE_AFTER) {
          nextHidden = true; // Scrolled down significantly
        } else if (accumulatedDelta < 0) {
          nextHidden = false; // Scrolled up significantly
        }

        if (nextHidden !== hidden) {
          hidden = nextHidden;
          node.style.transform = hidden
            ? `translate3d(0, -${node.offsetHeight}px, 0)`
            : "translate3d(0, 0, 0)";
        }
      }
      if (y <= 0) {
        if (hidden) {
          hidden = false;
          node.style.transform = "translate3d(0, 0, 0)";
        }
        accumulatedDelta = 0;
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(apply);
    };
    const node = shellRef.current;
    if (node) {
      if (!reducedMotion) {
        node.style.transition = "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)";
      }
      node.style.willChange = "transform";
    }
    scroller.addEventListener("scroll", onScroll as EventListener, { passive: true });
    apply();
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll as EventListener);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/40 motion-safe:transition-shadow shadow-none ${className}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      data-testid="sticky-search-shell"
    >
      {header && (
        <div
          ref={headerWrapperRef}
          style={{ transformOrigin: "left top", overflow: "hidden" }}
        >
          <div ref={headerRef} className="px-5 pt-3 pb-1">
            {header}
          </div>
        </div>
      )}

      <div className="px-5 pt-2 pb-3.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            className={`w-full h-12 rounded-2xl bg-muted/40 border border-border/40 pl-11 ${rightSlot ? 'pr-16' : 'pr-11'} text-[15px] font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground/50`}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className={`absolute ${rightSlot ? 'right-9' : 'right-3'} top-1/2 -translate-y-1/2`}
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
