import { describe, it, expect, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/geolocation", () => ({ Geolocation: {} }));

const { hasExactLocation, getPreciseLocation, LocationError } = await import("@/lib/precise-location");

const withFix = (coords: Partial<GeolocationCoordinates> | null, error?: { code: number }) => {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void, fail: (e: unknown) => void) =>
        error ? fail(error) : ok({ coords }),
    },
  });
};

describe("pinning the exact collection address", () => {
  it("knows a real pin from an empty one", () => {
    expect(hasExactLocation({ latitude: 22.34, longitude: 87.23 })).toBe(true);
    expect(hasExactLocation({ latitude: "22.34", longitude: "87.23" })).toBe(true);
    expect(hasExactLocation({ latitude: null, longitude: 87.23 })).toBe(false);
    expect(hasExactLocation({ latitude: 0, longitude: 0 })).toBe(false);
    expect(hasExactLocation(null)).toBe(false);
  });

  it("returns a precise GPS fix", async () => {
    withFix({ latitude: 22.34, longitude: 87.23, accuracy: 12.4 });
    await expect(getPreciseLocation()).resolves.toEqual({ latitude: 22.34, longitude: 87.23, accuracy: 12 });
  });

  it("refuses a rough fix that would only find the neighbourhood", async () => {
    withFix({ latitude: 22.34, longitude: 87.23, accuracy: 1500 });
    await expect(getPreciseLocation()).rejects.toMatchObject({ reason: "rough" });
  });

  it("says so when location permission is refused", async () => {
    withFix(null, { code: 1 });
    const error = await getPreciseLocation().catch((e) => e);
    expect(error).toBeInstanceOf(LocationError);
    expect(error.reason).toBe("denied");
  });
});
