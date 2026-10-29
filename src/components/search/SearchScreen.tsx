import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Sparkles, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSmartTestSearch } from "@/hooks/useSmartTestSearch";
import type { BridgeTest } from "@/hooks/useBridgeTests";
import { highlightTerms, searchHint } from "@/utils/search-intelligence";
import { simplifyTestName } from "@/utils/simplify-test-name";

/**
 * Search mode shared by Home and Explore Tests, as in big apps: a full-screen
 * search page over the screen, closed by its back arrow or the phone's Back.
 *
 * Opening adds a history step (state.searchOpen), so Back pops it instead of
 * leaving the screen (CapacitorBackButton checks the same flag). Opening a
 * result replaces that step with the test page, so Back from the test returns
 * to the screen rather than to the search step.
 */
export function useSearchMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const inHistory = (location.state as { searchOpen?: boolean } | null)?.searchOpen === true;
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => {
    setOpen(true);
    if (!inHistory) {
      navigate(location.pathname + location.search, {
        state: { ...((location.state as object | null) ?? {}), searchOpen: true },
      });
    }
  }, [navigate, location.pathname, location.search, location.state, inHistory]);

  const closeSearch = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    if (inHistory) navigate(-1);
    else setOpen(false);
  }, [navigate, inHistory]);

  const openTest = useCallback((test: BridgeTest) => {
    setOpen(false);
    navigate(`/test/${test.id}`, { replace: inHistory, state: { bridgeTest: test } });
  }, [navigate, inHistory]);

  // The history step was popped (Back) → leave search mode.
  useEffect(() => {
    if (!inHistory) {
      setOpen(false);
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }, [inHistory]);

  return { open, openSearch, closeSearch, openTest };
}

const POPULAR_SEARCHES = ["Sugar", "Thyroid", "CBC", "Vitamin D", "Lipid profile", "Liver function"];

const HighlightText = ({ text, words }: { text: string; words: string[] }) => {
  if (!words.length) return <span>{text}</span>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <span key={i} className="text-primary font-black">{part}</span> : <span key={i}>{part}</span>
      )}
    </span>
  );
};

interface SearchScreenProps {
  open: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onOpenTest: (test: BridgeTest) => void;
  placeholder?: string;
}

/**
 * The full-screen search page. It is drawn inside the screen's own tab layer
 * (found from where this component sits), so it covers that screen fully and a
 * test page opened from a result slides in above it.
 */
export const SearchScreen = ({ open, query, onQueryChange, onClose, onOpenTest, placeholder = "Search health tests..." }: SearchScreenProps) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setContainer(anchorRef.current?.closest<HTMLElement>("[data-tab-layer]") ?? document.body);
  }, []);

  const debouncedQuery = useDebounce(query, 300);
  const { results, understanding, isSearching } = useSmartTestSearch(debouncedQuery, { limit: 30, enabled: open });
  const hint = searchHint(understanding);
  const highlightWords = useMemo(() => highlightTerms(understanding), [understanding]);
  const pending = isSearching || query.trim() !== debouncedQuery.trim();

  const page = (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col" style={{ paddingTop: "var(--sat)" }} role="dialog" aria-label="Search tests">
      <div className="px-3 pt-2 pb-2 flex items-center gap-2 border-b border-border/50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="w-10 h-10 rounded-full flex items-center justify-center text-foreground active:bg-muted/60 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <input
            autoFocus
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 rounded-xl bg-muted/50 pl-4 pr-10 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
          />
          {query && (
            <button type="button" onClick={() => onQueryChange("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-28">
        {!query.trim() ? (
          <div className="bg-card shadow-2xl shadow-black/10 rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2.5">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onQueryChange(term)}
                  className="px-3 py-1.5 rounded-full bg-muted/60 text-[12.5px] font-semibold text-foreground active:scale-95 transition-transform"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card shadow-2xl shadow-black/10 rounded-2xl overflow-hidden">
            {hint && results.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-1.5 bg-primary/5 border-b border-border/40 text-[11px] font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{hint}</span>
              </div>
            )}
            {results.length > 0 ? (
              <div className="flex flex-col">
                {results.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => onOpenTest(test)}
                    className="w-full text-left px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                      <HighlightText text={simplifyTestName(test.test_name)} words={highlightWords} />
                    </p>
                  </button>
                ))}
              </div>
            ) : pending ? (
              <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching tests…
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-bold text-foreground">No tests found</p>
                <p className="text-xs font-medium text-muted-foreground">We couldn't find anything matching "{query}"</p>
                <button type="button" onClick={() => onQueryChange("")} className="mt-1 text-xs font-bold text-primary">
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      {open && container && createPortal(page, container)}
    </>
  );
};
