import { ReactNode, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSwipeBack } from "@/hooks/useSwipeBack";

/**
 * CSS-only, GPU-composited route transition (translate3d + opacity) plus an
 * interactive iOS-style edge swipe-back gesture.
 *
 * No JS animation loop drives the enter animation — the browser compositor
 * handles it — so the UI thread stays free for React work and scrolling.
 */
const PageTransition = ({ children, routeKey }: { children: ReactNode; routeKey?: string }) => {
  const location = useLocation();
  const key = routeKey ?? location.pathname;
  const ref = useRef<HTMLDivElement>(null);

  const isRoot =
    location.pathname === "/" ||
    location.pathname === "/home" ||
    location.pathname === "/login" ||
    location.pathname === "/onboarding";

  useSwipeBack(ref, !isRoot);

  return (
    <div key={key} ref={ref} className="page-transition">
      {children}
    </div>
  );
};

export default PageTransition;
