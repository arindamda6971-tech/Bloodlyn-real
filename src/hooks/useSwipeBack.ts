import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const EDGE_ZONE = 32; // px from the left edge that starts the gesture
const OPEN_THRESHOLD = 0.32; // fraction of width required to complete
const VELOCITY_THRESHOLD = 0.45; // px/ms — flick to dismiss

/**
 * iOS-style interactive swipe-back.
 * The dragged element's transform is written directly inside a single
 * requestAnimationFrame tick (translate3d only, no layout properties), so the
 * gesture runs entirely on the compositor at 60 fps and never triggers React
 * re-renders or layout thrash.
 */
export function useSwipeBack(target: React.RefObject<HTMLElement>, enabled = true) {
  const navigate = useNavigate();

  useEffect(() => {
    const el = target.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dx = 0;
    let tracking = false;
    let dragging = false;
    let frame = 0;

    const width = () => el.offsetWidth || window.innerWidth || 1;

    const paint = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, dx / width()));
      el.style.transform = `translate3d(${dx}px, 0, 0)`;
      el.style.opacity = String(1 - progress * 0.35);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const reset = (settle: boolean) => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (settle) {
        el.dataset.swipeSettle = "true";
        el.style.transform = "translate3d(0, 0, 0)";
        el.style.opacity = "1";
        window.setTimeout(() => {
          delete el.dataset.swipeSettle;
          el.style.willChange = "";
        }, 240);
      } else {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.willChange = "";
      }
      delete el.dataset.swiping;
      tracking = false;
      dragging = false;
      dx = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_ZONE) return;
      startX = t.clientX;
      startY = t.clientY;
      startTime = performance.now();
      tracking = true;
      dragging = false;
      dx = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const deltaX = t.clientX - startX;
      const deltaY = t.clientY - startY;

      if (!dragging) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          tracking = false;
          return;
        }
        if (deltaX < 8) return;
        dragging = true;
        el.dataset.swiping = "true";
        el.style.willChange = "transform, opacity";
      }

      dx = Math.max(0, deltaX);
      schedule();
    };

    const onTouchEnd = () => {
      if (!tracking) return;
      if (!dragging) {
        reset(false);
        return;
      }
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = dx / elapsed;
      const shouldGoBack = dx / width() > OPEN_THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (shouldGoBack) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        el.dataset.swipeSettle = "true";
        el.style.transform = `translate3d(${width()}px, 0, 0)`;
        el.style.opacity = "0.4";
        delete el.dataset.swiping;
        tracking = false;
        dragging = false;
        dx = 0;
        navigate(-1);
        return;
      }

      reset(true);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [target, enabled, navigate]);
}
