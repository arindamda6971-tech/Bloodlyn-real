import { describe, it, expect, vi } from "vitest";

const slots = vi.hoisted(() => ({ state: { data: undefined as unknown, isLoading: true } }));
vi.mock("@/hooks/useLabSlots", () => ({ useLabSlots: (id: string | null) => (id ? slots.state : { data: undefined, isLoading: false }) }));
import { render, screen } from "@testing-library/react";
import { LabAvatar, LabOpenBadge, LabRating, hasRealRating, labInitials } from "@/components/labs/lab-display";

describe("partner lab display shows only real data", () => {
  it("shows 'New' instead of a made-up rating when a lab has no reviews", () => {
    render(<LabRating rating={4.5} reviews={0} />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.queryByText("4.5")).not.toBeInTheDocument();
  });

  it("shows the rating and review count when reviews exist", () => {
    render(<LabRating rating={4.26} reviews={1830} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("(1,830)")).toBeInTheDocument();
    expect(hasRealRating(null, 10)).toBe(false);
  });

  it("uses the logo when there is one, otherwise the lab's initials", () => {
    const { rerender } = render(<LabAvatar name="Das Diagnostics" logoUrl="https://x/logo.png" />);
    expect(screen.getByRole("img", { name: "Das Diagnostics" })).toBeInTheDocument();
    rerender(<LabAvatar name="Das Diagnostics" />);
    expect(screen.getByText("DD")).toBeInTheDocument();
    expect(labInitials("Yo2")).toBe("YO");
    expect(labInitials("  ")).toBe("L");
  });
});

describe("Open / Closed badge (from the Partner schedule, same as booking)", () => {
  const week = (isOpen: boolean) => Object.fromEntries(Array.from({ length: 7 }, (_, d) => [d, { is_open: isOpen, slots: [], slotCapacities: {} }]));

  it("shows Open when the lab's schedule is open today", () => {
    slots.state = { data: { byDay: week(true), hasSchedule: true }, isLoading: false };
    render(<LabOpenBadge vendorId="lab-1" isActive />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("shows Closed when today is a closed day, or the lab has no schedule", () => {
    slots.state = { data: { byDay: week(false), hasSchedule: true }, isLoading: false };
    const { rerender } = render(<LabOpenBadge vendorId="lab-1" isActive />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
    slots.state = { data: { byDay: {}, hasSchedule: false }, isLoading: false };
    rerender(<LabOpenBadge vendorId="lab-2" isActive />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows Closed for a lab the admin switched off, without loading its schedule", () => {
    slots.state = { data: { byDay: week(true), hasSchedule: true }, isLoading: false };
    render(<LabOpenBadge vendorId="lab-1" isActive={false} />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows nothing while the schedule is loading", () => {
    slots.state = { data: undefined, isLoading: true };
    const { container } = render(<LabOpenBadge vendorId="lab-1" isActive />);
    expect(container).toBeEmptyDOMElement();
  });
});
