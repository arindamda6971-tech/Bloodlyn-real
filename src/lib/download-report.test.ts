import { describe, it, expect, vi, beforeEach } from "vitest";

const native = vi.hoisted(() => ({
  writes: [] as { path: string; directory: string }[],
  notifications: [] as { title: string; body: string }[],
  permission: "granted",
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Documents: "DOCUMENTS" },
  Filesystem: { writeFile: async (o: { path: string; directory: string }) => { native.writes.push(o); } },
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: native.permission }),
    requestPermissions: async () => ({ display: "granted" }),
    schedule: async ({ notifications }: { notifications: { title: string; body: string }[] }) => {
      native.notifications.push(...notifications);
    },
  },
}));
vi.mock("@/lib/offline-storage", () => ({ getOfflineReport: async () => null, saveReportOffline: async () => {} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("downloadReport on the phone", () => {
  beforeEach(() => {
    native.writes = [];
    native.notifications = [];
    native.permission = "granted";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["%PDF"], { type: "application/pdf" }))));
  });

  it("saves the PDF in Documents/BloodLyn Reports and shows a 'downloaded' notification", async () => {
    const { downloadReport } = await import("./download-report");
    const result = await downloadReport("https://x.test/report.pdf", "report-BL123");
    await vi.waitFor(() => expect(native.notifications).toHaveLength(1));

    expect(result.ok).toBe(true);
    expect(native.writes[0]).toMatchObject({ path: "BloodLyn Reports/report-BL123.pdf", directory: "DOCUMENTS" });
    expect(native.notifications[0].title).toBe("Your report is downloaded");
    expect(native.notifications[0].body).toContain("report-BL123.pdf");
  });

  it("still saves when notifications are turned off", async () => {
    native.permission = "denied";
    const { downloadReport } = await import("./download-report");
    const result = await downloadReport("https://x.test/report.jpg", "report-BL124");
    expect(result.ok).toBe(true);
    expect(native.writes[0].path).toBe("BloodLyn Reports/report-BL124.jpg");
    expect(native.notifications).toHaveLength(0);
  });
});
