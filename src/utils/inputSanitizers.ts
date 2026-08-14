/**
 * Universal Input Sanitizers for BloodLyn Mobile App
 * Ensures users can only enter valid, realistic human data and phone numbers.
 */

export const sanitizePhone = (value: string): string => {
  // Strip non-digits and limit to 10 digits
  return value.replace(/\D/g, "").slice(0, 10);
};

export const sanitizeInternationalPhone = (value: string): string => {
  // Allow '+' only at the start, and digits elsewhere, limit to 15 chars
  let str = value.replace(/[^\d+]/g, "");
  if (str.indexOf("+") > 0) {
    str = str.replace(/\+/g, "");
    if (value.startsWith("+")) str = "+" + str;
  }
  return str.slice(0, 15);
};

export const sanitizeAge = (value: string | number): string => {
  const str = String(value).replace(/\D/g, "");
  if (!str) return "";
  const num = parseInt(str, 10);
  if (num > 120) return "120";
  return str.slice(0, 3);
};

export const sanitizeWeight = (value: string | number): string => {
  // Allow digits and at most one decimal point
  let str = String(value).replace(/[^0-9.]/g, "");
  const parts = str.split(".");
  if (parts.length > 2) {
    str = parts[0] + "." + parts.slice(1).join("");
  }
  if (!str || str === ".") return str;
  const num = parseFloat(str);
  if (!isNaN(num) && num > 350) return "350";
  return str.slice(0, 5);
};

export const sanitizeHeight = (value: string | number): string => {
  // Allow digits and at most one decimal point
  let str = String(value).replace(/[^0-9.]/g, "");
  const parts = str.split(".");
  if (parts.length > 2) {
    str = parts[0] + "." + parts.slice(1).join("");
  }
  if (!str || str === ".") return str;
  const num = parseFloat(str);
  if (!isNaN(num) && num > 260) return "260";
  return str.slice(0, 5);
};

export const sanitizePincode = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 6);
};

export const sanitizeBloodPressure = (value: string): string => {
  // Allow digits and slash, limit length to 7 e.g. 200/120
  let str = value.replace(/[^0-9/]/g, "");
  const parts = str.split("/");
  if (parts.length > 2) {
    str = parts[0] + "/" + parts.slice(1).join("");
  }
  return str.slice(0, 7);
};

export const sanitizeBloodSugar = (value: string | number): string => {
  const str = String(value).replace(/\D/g, "");
  if (!str) return "";
  const num = parseInt(str, 10);
  if (num > 700) return "700";
  return str.slice(0, 3);
};
