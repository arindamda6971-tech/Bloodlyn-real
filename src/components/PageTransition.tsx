import { ReactNode, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const TAB_PATHS = ["/home", "/categories", "/bookings", "/reports", "/profile"];

/**
 * CSS-only, GPU-composited route transition (translate3d + opacity) plus an
 * interactive iOS-style edge swipe-back gesture.
 *
 * No JS animation loop drives the enter animation — the browser compositor
 * handles it — so the UI thread stays free for React work and scrolling.
 *
 * Direction awareness (`data-nav`): forward pushes slide in from the right,
 * back (POP) slides in from the left, tab switches cross-fade.
 */
const PageTransition = ({ children, routeKey }: { children: ReactNode; routeKey?: string }) => {
  const location = useLocation();
  const navType = useNavigationType();
  const key = routeKey ?? location.pathname;
  const ref = useRef<HTMLDivElement>(null);

  const isRoot =
    location.pathname === "/" ||
    location.pathname === "/home" ||
    location.pathname === "/login" ||
    location.pathname === "/onboarding";

  const navDirection = TAB_PATHS.includes(location.pathname)
    ? "tab"
    : navType === "POP"
      ? "back"
      : "forward";

  useSwipeBack(ref, !isRoot);


  return (
    <div
      key={key}
      ref={ref}
      className="page-transition"
      // Release the compositor layer as soon as the enter animation finishes so
      // long-lived pages don't hold GPU memory (a common source of jitter).
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.willChange = "auto";
      }}
    >
      {children}
    </div>
  );

};

export default PageTransition;
