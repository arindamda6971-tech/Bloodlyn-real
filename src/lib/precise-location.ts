import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

/** A GPS fix rougher than this is a neighbourhood, not a door, so it isn't saved. */
export const MAX_PIN_ACCURACY_M = 200;

export type PreciseLocation = { latitude: number; longitude: number; accuracy: number | null };

export class LocationError extends Error {
  constructor(public reason: "denied" | "unavailable" | "rough", message: string) {
    super(message);
  }
}

/** True when the coordinates are a real point (not empty, not 0,0). */
export function hasExactLocation(row: { latitude?: number | string | null; longitude?: number | string | null } | null | undefined): boolean {
  if (!row || row.latitude == null || row.longitude == null) return false;
  const lat = Number(row.latitude);
  const lon = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/**
 * Asks for location permission and takes one fresh, high-accuracy GPS reading
 * (no cached position), so the collector gets the patient's door, not the PIN area.
 */
export async function getPreciseLocation(): Promise<PreciseLocation> {
  let coords: GeolocationCoordinates | { latitude: number; longitude: number; accuracy?: number | null };
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (permission.location !== "granted") {
        throw new LocationError("denied", "Location permission is off. Allow it in your phone's settings to pin your exact location.");
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      coords = position.coords;
    } else {
      if (!navigator.geolocation) throw new LocationError("unavailable", "This device can't share its location.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }),
      );
      coords = position.coords;
    }
  } catch (error) {
    if (error instanceof LocationError) throw error;
    const code = (error as { code?: number })?.code;
    const text = String((error as Error)?.message ?? "").toLowerCase();
    if (code === 1 || text.includes("denied") || text.includes("permission")) {
      throw new LocationError("denied", "Location permission is off. Allow it in your phone's settings to pin your exact location.");
    }
    throw new LocationError("unavailable", "Couldn't get your location. Turn on GPS and try again.");
  }

  const accuracy = typeof coords.accuracy === "number" && Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null;
  if (accuracy != null && accuracy > MAX_PIN_ACCURACY_M) {
    throw new LocationError("rough", `Your phone's location is only accurate to about ${accuracy} m. Turn on GPS, step near a window and try again.`);
  }
  const location = { latitude: coords.latitude, longitude: coords.longitude, accuracy };
  if (!hasExactLocation(location)) throw new LocationError("unavailable", "Couldn't get your location. Turn on GPS and try again.");
  return location;
}
