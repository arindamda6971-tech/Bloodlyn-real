import type React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import DiagnosticCentersCarousel from "@/components/home/DiagnosticCentersCarousel";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The carousel also shows each lab's Open/Closed badge; its schedule is not under test here.
vi.mock("@/hooks/useLabSlots", () => ({ useLabSlots: () => ({ data: undefined, isLoading: true }) }));

// In-memory favorite_labs table behind a minimal Supabase query builder.
const db = vi.hoisted(() => ({
  saved: [] as string[],
  writes: [] as string[],
  listDelay: 0,
}));

vi.mock("@/integrations/supabase/client", () => {
  const select = () => {
    const chain = {
      eq: () => chain,
      order: async () => {
        if (db.listDelay) await new Promise((r) => setTimeout(r, db.listDelay));
        return { data: db.saved.map((lab_id) => ({ lab_id })), error: null };
      },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return chain;
  };
  return {
    supabase: {
      from: () => ({
        select,
        upsert: async ({ lab_id }: { lab_id: string }) => {
          db.writes.push(`add:${lab_id}`);
          await new Promise((r) => setTimeout(r, 150)); // a real save takes a moment
          if (!db.saved.includes(lab_id)) db.saved.unshift(lab_id);
          return { error: null };
        },
        delete: () => {
          const filters: Record<string, string> = {};
          const chain = {
            eq: (col: string, val: string) => {
              filters[col] = val;
              if (!("lab_id" in filters)) return chain;
              db.writes.push(`remove:${filters.lab_id}`);
              db.saved = db.saved.filter((id) => id !== filters.lab_id);
              return Promise.resolve({ error: null });
            },
          };
          return chain;
        },
      }),
    },
  };
});

const CENTERS = [
  { id: "lab-a", name: "Nibu Labs", rating: 4.5, tests: 100 },
  { id: "lab-b", name: "Das Diagnostics", rating: 4.5, tests: 100 },
  { id: "lab-c", name: "City Lab", rating: 4.4, tests: 100 },
];

const renderCarousel = () =>
  render(
    <MemoryRouter>
      <DiagnosticCentersCarousel centers={CENTERS as unknown as React.ComponentProps<typeof DiagnosticCentersCarousel>["centers"]} />
    </MemoryRouter>
  );

const labOrder = () => screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
const heart = (name: string) => screen.getByRole("button", { name: new RegExp(`(Save|Remove) ${name}`) });

describe("Partner labs heart (favorite labs)", () => {
  beforeEach(() => {
    db.saved = [];
    db.writes = [];
    db.listDelay = 0;
  });

  it("saves the tapped lab and keeps the card where it is", async () => {
    renderCarousel();
    await waitFor(() => expect(heart("Das Diagnostics")).toHaveAttribute("aria-pressed", "false"));

    fireEvent.click(heart("Das Diagnostics"));

    await waitFor(() => expect(heart("Das Diagnostics")).toHaveAttribute("aria-pressed", "true"));
    expect(db.saved).toEqual([]); // filled before the server has answered
    await waitFor(() => expect(db.saved).toEqual(["lab-b"]));
    expect(labOrder()).toEqual(["Nibu Labs", "Das Diagnostics", "City Lab"]);
  });

  it("ignores a second tap while the first is still saving", async () => {
    renderCarousel();
    await waitFor(() => expect(heart("City Lab")).toHaveAttribute("aria-pressed", "false"));

    fireEvent.click(heart("City Lab"));
    fireEvent.click(heart("City Lab"));

    await waitFor(() => expect(db.saved).toEqual(["lab-c"]));
    expect(db.writes).toEqual(["add:lab-c"]);
    expect(heart("City Lab")).toHaveAttribute("aria-pressed", "true");
  });

  it("removes a saved lab on a second tap once the first has finished", async () => {
    db.saved = ["lab-a"];
    renderCarousel();
    await waitFor(() => expect(heart("Nibu Labs")).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(heart("Nibu Labs"));

    await waitFor(() => expect(db.saved).toEqual([]));
    expect(heart("Nibu Labs")).toHaveAttribute("aria-pressed", "false");
  });

  it("a tap before the saved list loads still saves, without a duplicate error", async () => {
    const { toast } = await import("sonner");
    db.saved = ["lab-b"];
    db.listDelay = 50;
    renderCarousel();

    fireEvent.click(heart("Das Diagnostics"));

    await waitFor(() => expect(db.writes).toEqual(["add:lab-b"]));
    await waitFor(() => expect(heart("Das Diagnostics")).toHaveAttribute("aria-pressed", "true"));
    expect(db.saved).toEqual(["lab-b"]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows labs saved earlier first when the carousel opens", async () => {
    db.saved = ["lab-c"];
    renderCarousel();
    await waitFor(() => expect(labOrder()).toEqual(["City Lab", "Nibu Labs", "Das Diagnostics"]));
  });

  it("tapping the heart does not open the lab page", async () => {
    renderCarousel();
    await waitFor(() => expect(heart("Nibu Labs")).toHaveAttribute("aria-pressed", "false"));
    const before = window.location.pathname;
    fireEvent.click(heart("Nibu Labs"));
    expect(window.location.pathname).toBe(before);
    expect(screen.getByText("Partner labs")).toBeInTheDocument();
  });
});
