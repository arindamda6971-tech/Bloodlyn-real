import { labServesPincode } from "@/hooks/useUserPincode";

export const DEFAULT_LAB_SERVICE_RADIUS_KM = 25;

type CoordinateLike = {
  latitude?: number | null;
  longitude?: number | null;
};

type AddressLike = CoordinateLike & {
  pincode?: string | null;
};

type LabLike = CoordinateLike & {
  pincode?: string | null;
  service_pincodes?: unknown;
  is_active?: boolean | null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const calculateDistanceKm = (
  from: Pick<CoordinateLike, "latitude" | "longitude">,
  to: Pick<CoordinateLike, "latitude" | "longitude">
) => {
  const earthRadiusKm = 6371;
  const latDelta = toRadians((to.latitude ?? 0) - (from.latitude ?? 0));
  const lonDelta = toRadians((to.longitude ?? 0) - (from.longitude ?? 0));
  const fromLat = toRadians(from.latitude ?? 0);
  const toLat = toRadians(to.latitude ?? 0);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const isWithinServiceRadius = (
  lab: CoordinateLike | null | undefined,
  address: CoordinateLike | null | undefined,
  radiusKm = DEFAULT_LAB_SERVICE_RADIUS_KM
) => {
  if (
    lab?.latitude == null ||
    lab.longitude == null ||
    address?.latitude == null ||
    address.longitude == null
  ) {
    return true;
  }

  return calculateDistanceKm(
    { latitude: lab.latitude, longitude: lab.longitude },
    { latitude: address.latitude, longitude: address.longitude }
  ) <= radiusKm;
};

export const evaluateLabServiceability = (
  lab: LabLike | null | undefined,
  address: AddressLike | null | undefined,
  radiusKm = DEFAULT_LAB_SERVICE_RADIUS_KM
) => {
  if (!lab) return { serviceable: false, reason: "missing-lab" };
  if (lab.is_active === false) return { serviceable: false, reason: "inactive" };

  const addressPincode = address?.pincode?.trim() || null;
  if (addressPincode && !labServesPincode(lab, addressPincode)) {
    return { serviceable: false, reason: "pincode" };
  }

  if (!isWithinServiceRadius(lab, address, radiusKm)) {
    return { serviceable: false, reason: "distance" };
  }

  return { serviceable: true, reason: null };
};