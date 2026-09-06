import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const SCROLL_CACHE_KEY = 'bloodlyn_scroll_offsets';

// Initialize from memory to survive cold starts
const initialOffsets = (): Map<string, number> => {
  try {
    const saved = localStorage.getItem(SCROLL_CACHE_KEY);
    if (saved) return new Map(Object.entries(JSON.parse(saved)));
  } catch (e) {
    // ignore
  }
  return new Map<string, number>();
};

const offsets = initialOffsets();

const saveOffsets = () => {
  try {
    const obj = Object.fromEntries(offsets.entries());
    localStorage.setItem(SCROLL_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // ignore
  }
};

const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key || location.pathname;

  useEffect(() => {
    // AnimatePresence keeps exiting pages in the DOM. The entering page
    // is appended last, so we always target the last container.
    const containers = document.querySelectorAll<HTMLElement>("[data-scroll-container]");
    const activeContainer = containers[containers.length - 1];
    
    const restore = navType === "POP" ? offsets.get(key) ?? 0 : 0;

    // Wait a frame so the incoming screen has laid out before scrolling.
    const raf = requestAnimationFrame(() => {
      if (activeContainer) activeContainer.scrollTop = restore;
      window.scrollTo(0, restore);
    });

    return () => {
      cancelAnimationFrame(raf);
      // Capture the exact container that was active to save its final scroll position
      offsets.set(key, activeContainer?.scrollTop ?? window.scrollY ?? 0);
      saveOffsets();
    };
  }, [key, navType]);

  return null;
};

export default ScrollToTop;
