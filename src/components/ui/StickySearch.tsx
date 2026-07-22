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

    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const oy = style.overflowY;
      if (oy === "auto" || oy === "scroll") break;
      parent = parent.parentElement;
    }
    const scroller: HTMLElement | Window = parent || window;

    let ticking = false;
    let hasShadow = false;

    const applyScroll = () => {
      ticking = false;
      const y = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
      const shellNode = shellRef.current;

      if (!shellNode) return;

      // Add dynamic glassmorphic shadow hysteresis when scrolled down past header
      const nextShadow = hasShadow ? y > THRESHOLD_OFF : y > THRESHOLD_ON;
      if (nextShadow !== hasShadow) {
        hasShadow = nextShadow;
        if (nextShadow) shellNode.classList.add(SHADOW_CLASS);
        else shellNode.classList.remove(SHADOW_CLASS);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyScroll);
      }
    };

    scroller.addEventListener("scroll", onScroll as EventListener, { passive: true });
    applyScroll();
    return () => {
      scroller.removeEventListener("scroll", onScroll as EventListener);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`sticky top-0 z-40 bg-background/95 backdrop-blur-2xl motion-safe:transition-shadow shadow-none ${className}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      data-testid="sticky-search-shell"
    >
      {/* Seamless unified premium background elements across both header and search bar */}
      {accent && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.08] pointer-events-none`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
          <div className="pointer-events-none absolute -top-8 -right-6 w-36 h-36 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-gradient-to-tr from-blue-500/20 to-transparent blur-2xl" />
        </>
      )}

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

      <div className={`px-5 ${header ? "pt-1" : "pt-2"} pb-3.5`}>
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
