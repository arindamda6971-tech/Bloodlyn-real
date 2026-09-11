const SERVICE_PIN_PREFIX = "bloodlyn_service_pincode_";
const LOCATION_CHECK_PREFIX = "location_checked_";
export const SERVICE_PIN_CHANGED_EVENT = "bloodlyn:service-pincode-changed";

const isValidPincode = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^\d{6}$/.test(value.trim());

export const getServicePincode = (userId?: string | null): string | null => {
  if (!userId) return null;
  try {
    const value = localStorage.getItem(`${SERVICE_PIN_PREFIX}${userId}`);
    return isValidPincode(value) ? value.trim() : null;
  } catch {
    return null;
  }
};

export const setServicePincode = (userId: string, pincode: string) => {
  const normalized = pincode.trim();
  if (!isValidPincode(normalized)) return false;
  try {
    localStorage.setItem(`${SERVICE_PIN_PREFIX}${userId}`, normalized);
    localStorage.setItem(`${LOCATION_CHECK_PREFIX}${userId}`, "true");
    window.dispatchEvent(new CustomEvent(SERVICE_PIN_CHANGED_EVENT, { detail: normalized }));
    return true;
  } catch {
    return false;
  }
};

export const clearServicePincode = (userId: string) => {
  try {
    localStorage.removeItem(`${SERVICE_PIN_PREFIX}${userId}`);
    localStorage.removeItem(`${LOCATION_CHECK_PREFIX}${userId}`);
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
};

export const isCompleteCollectionAddress = (address: {
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}) => {
  const line = address.address_line1?.trim() ?? "";
  const pin = address.pincode?.trim() ?? "";
  const isLegacyPlaceholder = /^(location\s*-\s*)?pin\s*\d{6}$/i.test(line);
  return Boolean(line && address.city?.trim() && address.state?.trim() && /^\d{6}$/.test(pin) && !isLegacyPlaceholder);
};