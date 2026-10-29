import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: auth.session } }) } },
}));
vi.mock("@/lib/boot", () => ({ markAppReady: () => {} }));

import SplashScreen from "@/pages/SplashScreen";

const launch = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/home" element={<p>Home</p>} />
        <Route path="/tracking/:id" element={<p>Tracking</p>} />
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/onboarding" element={<p>Onboarding</p>} />
      </Routes>
    </MemoryRouter>
  );

describe("fresh app launch (after the app was closed or killed)", () => {
  beforeEach(() => localStorage.clear());

  it("opens Home for a signed-in user, not the screen they left", async () => {
    auth.session = { user: { id: "u1" } };
    localStorage.setItem("bloodlyn_last_route", "/tracking/abc"); // left by older versions
    launch();
    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
    expect(screen.queryByText("Tracking")).not.toBeInTheDocument();
    expect(localStorage.getItem("bloodlyn_last_route")).toBeNull();
  });

  it("still sends signed-out users to login or onboarding", async () => {
    auth.session = null;
    localStorage.setItem("bloodlyn-onboarded", "1");
    launch();
    await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());
  });

  it("forgets scroll positions from an earlier session", async () => {
    localStorage.setItem("bloodlyn_scroll_offsets", JSON.stringify({ default: 900 }));
    vi.resetModules();
    await import("@/components/ScrollToTop");
    expect(localStorage.getItem("bloodlyn_scroll_offsets")).toBeNull();
  });
});
