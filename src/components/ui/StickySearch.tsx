import { ReactNode, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface StickySearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Optional content rendered above the search bar that should squeeze on scroll */
  topContent?: ReactNode;
  className?: string;
}

/**
 * StickySearch — search bar that stays pinned to the top while the content above
 * it gradually collapses on scroll. Uses cheap GPU transforms (no layout thrash).
 */
const StickySearch = ({ value, onChange, placeholder = "Search…", topContent, className = "" }: StickySearchProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [squeezed, setSqueezed] = useState(false);

  useEffect(() => {
    let el: HTMLElement | null = wrapRef.current?.parentElement ?? null;
    let scroller: HTMLElement | null = null;
    while (el) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY)) { scroller = el; break; }
      el = el.parentElement;
    }
    const target: HTMLElement | Window = scroller ?? window;
    const onScroll = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      setSqueezed(y > 24);
    };
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true } as any);
    return () => target.removeEventListener("scroll", onScroll as any);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`sticky top-0 z-30 bg-background/85 backdrop-blur-xl transition-shadow ${
        squeezed ? "shadow-sm border-b border-border/60" : ""
      } ${className}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
    >
      {topContent && (
        <div
          className="overflow-hidden transition-all duration-300 ease-out origin-top"
          style={{
            maxHeight: squeezed ? 0 : 120,
            opacity: squeezed ? 0 : 1,
            transform: squeezed ? "scaleY(0.85)" : "scaleY(1)",
          }}
        >
          {topContent}
        </div>
      )}
      <div className="px-4 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9 h-10 rounded-xl bg-muted/70 border-0"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickySearch;
