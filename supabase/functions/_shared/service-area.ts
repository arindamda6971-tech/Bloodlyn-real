// Shared by the app (via src/hooks/useUserPincode.ts) and create-order, so the
// screens and the server always agree on which labs collect where.

/**
 * Returns true if a lab collects samples in the given user pincode.
 * A lab serves its own pincode plus every pincode in its service_pincodes list
 * (set on the Partner portal), the same rule LocationCheckScreen and
 * LocationChip use to say a PIN is serviceable. A lab with neither is hidden.
 * If userPincode is null (no address yet), all labs pass through (no regression).
 */
export const labServesPincode = (
  lab: { pincode?: string | null; service_pincodes?: unknown } | null | undefined,
  userPincode: string | null,
): boolean => {
  if (!userPincode) return true;
  if (!lab) return false;
  const list = Array.isArray(lab.service_pincodes)
    ? (lab.service_pincodes as unknown[]).map((p) => String(p).trim())
    : [];
  if (list.includes(userPincode)) return true;
  // The lab's own pincode field. Supports comma/space/semicolon-separated
  // values (some vendors store multiple pincodes in a single text column).
  const raw = (lab.pincode || "").trim();
  if (!raw) return false;
  const pins = raw.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  return pins.includes(userPincode);
};
