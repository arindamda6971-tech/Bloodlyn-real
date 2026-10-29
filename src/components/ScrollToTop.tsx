import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { TAB_PATHS, whenTransitionSettled } from "@/lib/navigation-transition";

const SCROLL_CACHE_KEY = 'bloodlyn_scroll_offsets';

// Scroll positions last only for the current app session (sessionStorage is
// cleared when the app is closed or killed), so a fresh launch never reopens
// screens at old positions. Older versions kept them in localStorage.
const initialOffsets = (): Map<string, number> => {
  try {
    localStorage.removeItem(SCROLL_CACHE_KEY);
    const saved = sessionStorage.getItem(SCROLL_CACHE_KEY);
    if (saved) return new Map(Object.entries(JSON.parse(saved)));
  } catch (e) {
    // ignore
  }
  return new Map<string, number>();
};

const offsets = initialOffsets();
let saveScheduled = false;

const performSave = () => {
  saveScheduled = false;
  try {
    const obj = Object.fromEntries(offsets.entries());
    sessionStorage.setItem(SCROLL_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // ignore
  }
};

const saveOffsets = () => {
  if (saveScheduled) return;
  saveScheduled = true;

  whenTransitionSettled(() => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (ric) {
      ric(() => performSave(), { timeout: 1000 });
    } else {
      setTimeout(() => performSave(), 100);
    }
  });
};

const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key || location.pathname;

  useLayoutEffect(() => {
    // Bottom-bar tabs are kept alive in their own persistent scroll containers; preserve
    // their native scroll position without resetting it to 0 on POP or PUSH.
    if (TAB_PATHS.includes(location.pathname)) {
      return;
    }

    const containers = document.querySelectorAll<HTMLElement>("[data-scroll-container]");
    const activeContainer = containers[containers.length - 1];
    
    const restore = navType === "POP" ? offsets.get(key) ?? 0 : 0;

    if (activeContainer) {
      activeContainer.scrollTop = restore;
    }
    window.scrollTo(0, restore);

    return () => {
      // Capture the exact container that was active to save its final scroll position
      offsets.set(key, activeContainer?.scrollTop ?? window.scrollY ?? 0);
      saveOffsets();
    };
  }, [key, navType, location.pathname]);

  return null;
};

export default ScrollToTop;
