import { describe, it, expect, vi, afterEach } from "vitest";
import { MEET_ANDROID_URL, MEET_IOS_URL, meetInstallUrl, meetLinkOf, openMeet } from "@/lib/meet";

describe("Google Meet on the patient's booking", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only treats a real Google Meet link as joinable", () => {
    expect(meetLinkOf({ meet_link: "https://meet.google.com/abc-defg-hij" })).toBe("https://meet.google.com/abc-defg-hij");
    expect(meetLinkOf({ meet_link: "https://meet.jit.si/room" })).toBeNull();
    expect(meetLinkOf({ meet_link: "javascript:alert(1)" })).toBeNull();
    expect(meetLinkOf({ meet_link: null })).toBeNull();
    expect(meetLinkOf(null)).toBeNull();
  });

  it("sends an iPhone to the App Store and other phones to Google Play", () => {
    expect(meetInstallUrl("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(MEET_IOS_URL);
    expect(meetInstallUrl("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(MEET_ANDROID_URL);
  });

  it("opens Meet outside the app, falling back to a new tab", () => {
    const open = vi.spyOn(window, "open").mockReturnValueOnce(null).mockReturnValueOnce({} as Window);
    openMeet("https://meet.google.com/abc-defg-hij");
    expect(open).toHaveBeenNthCalledWith(1, "https://meet.google.com/abc-defg-hij", "_system");
    expect(open).toHaveBeenNthCalledWith(2, "https://meet.google.com/abc-defg-hij", "_blank");
  });
});
