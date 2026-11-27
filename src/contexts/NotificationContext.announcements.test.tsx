import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// An announcement published in Admin reaches the patient as an ordinary notification, once.
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "patient-1" } }) }));
vi.mock("@/lib/userLive", () => ({ subscribeUserLive: () => () => {} }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: { requestPermissions: vi.fn(), checkPermissions: vi.fn(), schedule: vi.fn() },
}));

import { NotificationProvider, useNotifications } from "./NotificationContext";

const fetchStub = vi.spyOn(globalThis, "fetch");

function Bell() {
  const { notifications, unreadCount } = useNotifications();
  return (
    <div>
      <p data-testid="unread">{unreadCount}</p>
      {notifications.map((n) => (
        <p key={n.id}>
          {n.type}: {n.title} / {n.message}
        </p>
      ))}
    </div>
  );
}

const show = () =>
  render(
    <NotificationProvider>
      <Bell />
    </NotificationProvider>,
  );

describe("announcements as notifications", () => {
  afterAll(() => fetchStub.mockRestore());

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchStub.mockReset();
    fetchStub.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          announcements: [
            { id: "a1", title: "Sunday timings", message: "Collections start at 8 am this Sunday.", type: "info", priority: "normal", publish_at: "2026-11-27T00:00:00Z" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  it("adds a new announcement to the notifications, unread", async () => {
    show();
    expect(await screen.findByText("announcement: Sunday timings / Collections start at 8 am this Sunday.")).toBeInTheDocument();
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
    expect(String(fetchStub.mock.calls[0][0])).toContain("bridge-announcements?audience=user_app");
  });

  it("never adds the same announcement twice on one device", async () => {
    const first = show();
    await screen.findByText(/Sunday timings/);
    first.unmount();
    sessionStorage.clear(); // The app was closed: its list is gone.

    show();
    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1)); // Saved answer reused, no new call.
    expect(screen.queryByText(/Sunday timings/)).not.toBeInTheDocument();
    expect(screen.getByTestId("unread")).toHaveTextContent("0");
  });
});
