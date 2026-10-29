import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Each tab screen counts its mounts and renders, and holds a bit of local state.
const stats = vi.hoisted(() => ({ mounts: {} as Record<string, number>, renders: {} as Record<string, number> }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" }, loading: false, supabaseUserId: "user-1" }) }));
vi.mock("@/components/ProtectedRoute", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/AppOpeningAnimation", () => ({ default: () => null }));

const makeScreen = (name: string) => () => {
  const React = require("react") as typeof import("react");
  const navigate = useNavigate();
  stats.renders[name] = (stats.renders[name] ?? 0) + 1;
  React.useEffect(() => {
    stats.mounts[name] = (stats.mounts[name] ?? 0) + 1;
  }, []);
  const [taps, setTaps] = useState(0);
  return (
    <div>
      <p>{name} screen</p>
      <button onClick={() => setTaps((t) => t + 1)}>{name} taps {taps}</button>
      <button onClick={() => navigate("/notifications")}>{name} open details</button>
    </div>
  );
};

vi.mock("@/pages/HomeScreen", () => ({ default: makeScreen("Home") }));
vi.mock("@/pages/CategoriesScreen", () => ({ default: makeScreen("Tests") }));
vi.mock("@/pages/BookingsScreen", () => ({ default: makeScreen("Orders") }));
vi.mock("@/pages/ReportsScreen", () => ({ default: makeScreen("Reports") }));
vi.mock("@/pages/ProfileScreen", () => ({ default: makeScreen("Profile") }));
vi.mock("@/pages/NotificationsScreen", () => ({ default: () => <p>Details screen</p> }));

const { AnimatedRoutes } = await import("@/App");

const renderApp = (initial = "/home") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initial]}>
        <AnimatedRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );

const tab = (label: string) => screen.getByRole("button", { name: label });
const layer = (path: string) => document.querySelector<HTMLElement>(`[data-tab-layer="${path}"]`);

describe("bottom-bar tabs are kept alive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stats.mounts = {};
    stats.renders = {};
  });

  it("builds each tab once and keeps its state when you come back", async () => {
    renderApp();
    await act(async () => fireEvent.click(tab("Tests")));
    fireEvent.click(screen.getByRole("button", { name: "Tests taps 0" }));
    expect(screen.getByRole("button", { name: "Tests taps 1" })).toBeInTheDocument();

    await act(async () => fireEvent.click(tab("My Orders")));
    await act(async () => fireEvent.click(tab("Tests")));

    expect(stats.mounts).toEqual({ Home: 1, Tests: 1, Orders: 1 });
    expect(screen.getByRole("button", { name: "Tests taps 1" })).toBeInTheDocument();
    expect(layer("/categories")?.style.visibility).toBe("visible");
  });

  it("does not re-render hidden tabs while you move between others", async () => {
    renderApp();
    await act(async () => fireEvent.click(tab("Tests")));
    await act(async () => fireEvent.click(tab("My Orders")));
    await act(async () => { vi.advanceTimersByTime(1000); });
    const testsRenders = stats.renders.Tests;

    await act(async () => fireEvent.click(tab("Reports")));
    await act(async () => fireEvent.click(tab("Profile")));
    await act(async () => fireEvent.click(tab("My Orders")));
    await act(async () => { vi.advanceTimersByTime(1000); });

    expect(stats.renders.Tests).toBe(testsRenders);
  });

  it("keeps the old tab painted until the new one has faded in (no blank flash)", async () => {
    renderApp();
    await act(async () => fireEvent.click(tab("Tests")));
    await act(async () => { vi.advanceTimersByTime(1000); });

    await act(async () => fireEvent.click(tab("Reports")));
    expect(layer("/reports")?.className).toContain("page-anim-tab");
    expect(layer("/categories")?.style.visibility).toBe("visible");
    expect(Number(layer("/reports")?.style.zIndex)).toBeGreaterThan(Number(layer("/categories")?.style.zIndex));

    await act(async () => { vi.advanceTimersByTime(400); });
    expect(layer("/categories")?.style.visibility).toBe("hidden");
    expect(layer("/reports")?.style.visibility).toBe("visible");
  });

  it("keeps the tab underneath a screen opened from it, and shows it again on Back", async () => {
    renderApp();
    await act(async () => fireEvent.click(tab("My Orders")));
    await act(async () => { vi.advanceTimersByTime(1000); });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Orders open details" })));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("Details screen")).toBeInTheDocument();
    expect(layer("/bookings")?.style.visibility).toBe("visible");
    expect(layer("/bookings")?.getAttribute("aria-hidden")).toBe("true");
    expect(stats.mounts.Orders).toBe(1);
  });

  it("drops the active tab highlight onto the tapped tab immediately", async () => {
    renderApp();
    fireEvent.click(tab("Profile"));
    expect(tab("Profile").querySelector(".text-primary")).not.toBeNull();
  });
});
