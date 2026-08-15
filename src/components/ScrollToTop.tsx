import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const offsets = new Map<string, number>();

const getContainer = () =>
  document.querySelector<HTMLElement>("[data-scroll-container]");

/**
 * Native-style scroll behaviour:
 * - forward navigation (PUSH/REPLACE) starts at the top
 * - back navigation (POP) restores the previous scroll offset for that entry
 *
 * The app scrolls inside `[data-scroll-container]` (MobileLayout), so window
 * scroll alone is not enough — both are handled.
 */
const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key || location.pathname;

  useEffect(() => {
    const el = getContainer();
    const restore = navType === "POP" ? offsets.get(key) ?? 0 : 0;

    // Wait a frame so the incoming screen has laid out before scrolling.
    const raf = requestAnimationFrame(() => {
      if (el) el.scrollTop = restore;
      window.scrollTo(0, restore);
    });

    return () => {
      cancelAnimationFrame(raf);
      const current = getContainer();
      offsets.set(key, current?.scrollTop ?? window.scrollY ?? 0);
    };
  }, [key, navType]);

  return null;
};

export default ScrollToTop;
