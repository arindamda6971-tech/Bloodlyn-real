import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { recordNavigation } from "@/lib/navigation-transition";

// Opening a screen and going Back over and over, faster than the 450ms slide, used to
// leave every released screen mounted (hidden) until the last exit finished, so the
// app piled up whole screens until the WebView lagged and crashed.

const mounted = new Set<string>();
const Screen = ({ name }: { name: string }) => {
  // Track which screens are actually mounted (holding their tree and data).
  mounted.add(name);
  return <p data-screen={name}>{name}</p>;
};

let navigate: ReturnType<typeof useNavigate>;
const Shell = () => {
  const location = useLocation();
  recordNavigation(location.pathname, useNavigationType());
  navigate = useNavigate();
  return (
    <AnimatePresence initial={false}>
      <PageTransition location={location} key={location.pathname}>
        <Routes location={location}>
          <Route path="/list" element={<Screen name="list" />} />
          {["a", "b", "c", "d", "e"].map((n) => (
            <Route key={n} path={`/detail/${n}`} element={<Screen name={n} />} />
          ))}
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
};

const layers = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>("div.absolute.top-0.left-0")];
const withContent = (container: HTMLElement) => layers(container).filter((el) => el.querySelector("[data-screen]"));

describe("rapid open / Back", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mounted.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("never keeps more than the arriving and one leaving screen alive", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/list"]}>
        <Shell />
      </MemoryRouter>,
    );

    let peak = 0;
    for (let i = 0; i < 12; i += 1) {
      const name = ["a", "b", "c", "d", "e"][i % 5];
      await act(async () => navigate(`/detail/${name}`));
      await act(async () => { vi.advanceTimersByTime(60); });
      peak = Math.max(peak, withContent(container).length);
      await act(async () => navigate(-1));
      await act(async () => { vi.advanceTimersByTime(60); });
      peak = Math.max(peak, withContent(container).length);
    }

    expect(peak).toBeLessThanOrEqual(2);

    // Once things settle, only the list is left.
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(withContent(container).map((el) => el.textContent)).toEqual(["list"]);
  });
});
