import { describe, it, expect, afterEach } from "vitest";
import { installTapGuard, isTapGuarded, recordNavigation, TAP_GUARD_MS } from "@/lib/navigation-transition";

const screenButton = () => {
  const layer = document.createElement("div");
  layer.setAttribute("data-screen-layer", "");
  const button = document.createElement("button");
  layer.appendChild(button);
  document.body.appendChild(layer);
  return button;
};

describe("tap guard (iOS-style)", () => {
  let uninstall: (() => void) | null = null;
  afterEach(() => {
    uninstall?.();
    document.body.innerHTML = "";
  });

  it("drops a tap on screen content right after a navigation, then lets taps through", () => {
    const button = screenButton();
    recordNavigation(`/guard-${Math.random()}`, "PUSH");
    const t = performance.now();
    expect(isTapGuarded(button, t)).toBe(true);
    expect(isTapGuarded(button, t + TAP_GUARD_MS + 1)).toBe(false);
  });

  it("never blocks taps outside the screen layers (bottom bar, dialogs)", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    recordNavigation(`/guard-${Math.random()}`, "PUSH");
    expect(isTapGuarded(outside)).toBe(false);
  });

  it("stops the click before the app's own handler runs", () => {
    uninstall = installTapGuard();
    const button = screenButton();
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    recordNavigation(`/guard-${Math.random()}`, "PUSH");
    button.click();
    expect(clicks).toBe(0);
  });
});
