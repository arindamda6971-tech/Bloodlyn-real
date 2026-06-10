import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import StickySearch from "@/components/ui/StickySearch";

const SHADOW_CLASS = "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]";

// Force rAF to run synchronously so we can assert DOM state immediately.
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

const renderInScroller = (initial = "") => {
  const utils = render(
    <div
      data-testid="scroller"
      style={{ overflowY: "auto", height: 200 }}
    >
      <StickySearch value={initial} onChange={() => {}} />
      <div style={{ height: 2000 }} />
    </div>,
  );
  const scroller = utils.getByTestId("scroller") as HTMLDivElement;
  const shell = utils.getByTestId("sticky-search-shell") as HTMLDivElement;
  return { ...utils, scroller, shell };
};

const fireScroll = (scroller: HTMLElement, y: number) => {
  Object.defineProperty(scroller, "scrollTop", { value: y, configurable: true });
  act(() => {
    scroller.dispatchEvent(new Event("scroll"));
  });
};

describe("StickySearch shadow threshold", () => {
  it("starts without a shadow", () => {
    const { shell } = renderInScroller();
    expect(shell.classList.contains(SHADOW_CLASS)).toBe(false);
  });

  it("does not add shadow below the ON threshold (8px)", () => {
    const { shell, scroller } = renderInScroller();
    fireScroll(scroller, 5);
    expect(shell.classList.contains(SHADOW_CLASS)).toBe(false);
  });

  it("adds shadow once scroll crosses the ON threshold", () => {
    const { shell, scroller } = renderInScroller();
    fireScroll(scroller, 20);
    expect(shell.classList.contains(SHADOW_CLASS)).toBe(true);
  });

  it("keeps shadow inside the hysteresis band (between OFF and ON)", () => {
    const { shell, scroller } = renderInScroller();
    fireScroll(scroller, 20); // on
    fireScroll(scroller, 5);  // still > OFF (2), should remain on
    expect(shell.classList.contains(SHADOW_CLASS)).toBe(true);
  });

  it("removes shadow when scroll falls below the OFF threshold", () => {
    const { shell, scroller } = renderInScroller();
    fireScroll(scroller, 20);
    fireScroll(scroller, 0);
    expect(shell.classList.contains(SHADOW_CLASS)).toBe(false);
  });

  it("does not mutate classList on scroll events that don't cross a threshold", () => {
    const { shell, scroller } = renderInScroller();
    fireScroll(scroller, 20); // on
    const spy = vi.spyOn(shell.classList, "add");
    const removeSpy = vi.spyOn(shell.classList, "remove");
    for (let y = 20; y < 60; y += 1) fireScroll(scroller, y);
    expect(spy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
  });
});
