import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import PersistentBottomNavigation from "@/components/layout/PersistentBottomNavigation";
import MobileLayout from "@/components/layout/MobileLayout";
import { recordNavigation } from "@/lib/navigation-transition";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Screen = ({ name }: { name: string }) => (
  <MobileLayout>
    <p>{name} screen</p>
  </MobileLayout>
);

const Shell = () => {
  const location = useLocation();
  recordNavigation(location.pathname, useNavigationType());
  return (
    <>
      <AnimatePresence initial={false}>
        <PageTransition location={location} key={location.pathname}>
          <Routes location={location}>
            <Route path="/categories" element={<Screen name="Tests" />} />
            <Route path="/bookings" element={<Screen name="Orders" />} />
            <Route path="/reports" element={<Screen name="Reports" />} />
            <Route path="/profile" element={<Screen name="Profile" />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
      <PersistentBottomNavigation />
    </>
  );
};

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/categories"]}>
        <Shell />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("bottom tab navigation", () => {
  it("keeps one bottom bar and one screen through rapid tab taps", async () => {
    const { container } = renderApp();
    const tabs = ["My Orders", "Reports", "Profile", "Tests", "My Orders", "Reports"];
    const visibleLayers = () =>
      [...container.querySelectorAll<HTMLElement>("div.absolute.top-0.left-0")].filter(
        (el) => el.style.visibility !== "hidden",
      );

    const nextFrame = () =>
      act(() => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));

    // Tapping straight back to a tab before its removal has landed must show it again.
    act(() => {
      fireEvent.click(screen.getByText("My Orders"));
    });
    act(() => {
      fireEvent.click(screen.getByText("Tests"));
    });
    expect(visibleLayers().map((el) => el.textContent)).toEqual(["Tests screen"]);
    await nextFrame();

    for (const label of tabs) {
      act(() => {
        fireEvent.click(screen.getByText(label));
      });
      // Tabs fade through instead of sliding: the previous tab is hidden at once, not
      // stacked underneath, and only the incoming tab animates...
      expect(visibleLayers()).toHaveLength(1);
      expect(visibleLayers()[0].classList.contains("page-anim-tab")).toBe(true);
      expect(container.querySelectorAll("nav")).toHaveLength(1);
      // ...and unmounted on the next frame, so taps never pile up mounted screens.
      await nextFrame();
      expect(container.querySelectorAll("p")).toHaveLength(1);
    }

    expect(screen.getByText("Reports screen")).toBeTruthy();
    expect(container.querySelector(".page-anim-push, .page-anim-pop")).toBeNull();
  });
});
