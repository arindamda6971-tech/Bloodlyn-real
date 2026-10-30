import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HealthPackagesSection from "@/components/home/HealthPackagesSection";
import { packagesStaleTime } from "@/hooks/useActivePackages";
import { toHealthPackage, type HealthPackage } from "@/lib/health-packages";

const api = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/health-packages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/health-packages")>()),
  fetchActivePackages: () => api.fetch(),
}));

const pkg: HealthPackage = toHealthPackage({
  id: "p1",
  name: "Full Body Essential",
  price: 999,
  tests_count: 3,
  diagnostic_centers: { id: "lab-1", name: "Das Diagnostics" },
});

const show = (seed?: HealthPackage[], seededAt = Date.now()) => {
  // retryDelay 0: the hook's own retries shouldn't slow the test down.
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  if (seed) client.setQueryData(["active-health-packages"], seed, { updatedAt: seededAt });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HealthPackagesSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Home health packages", () => {
  beforeEach(() => {
    api.fetch.mockReset();
  });

  it("says the load failed, not that there are no packages, and recovers on Try again", async () => {
    api.fetch.mockRejectedValue(new Error("network down"));
    show();

    expect(await screen.findByText("Couldn't load health packages")).toBeInTheDocument();
    expect(screen.queryByText("No health packages yet")).not.toBeInTheDocument();

    api.fetch.mockResolvedValue([pkg]);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Full Body Essential")).toBeInTheDocument();
  });

  it("asks again when the saved list is empty, even if it was saved moments ago", async () => {
    api.fetch.mockResolvedValue([pkg]);
    show([]);
    expect(await screen.findByText("Full Body Essential")).toBeInTheDocument();
  });

  it("keeps showing saved packages when a refresh fails", async () => {
    let calls = 0;
    api.fetch.mockImplementation(async () => {
      calls++;
      throw new Error("network down");
    });
    show([pkg], Date.now() - 10 * 60 * 1000); // an old copy, so it refreshes on open
    await waitFor(() => expect(calls).toBe(3)); // first try + 2 retries
    await new Promise((r) => setTimeout(r, 20)); // let the last failure land
    expect(screen.getByText("Full Body Essential")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load health packages")).not.toBeInTheDocument();
  });

  it("only treats a non-empty list as fresh", () => {
    expect(packagesStaleTime([])).toBe(0);
    expect(packagesStaleTime(undefined)).toBe(0);
    expect(packagesStaleTime([pkg])).toBe(5 * 60 * 1000);
  });
});
