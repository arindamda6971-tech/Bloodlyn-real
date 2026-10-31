import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compress-image";

/**
 * Order prescription attachments.
 *
 * Files live in the private `order-prescriptions` storage bucket under
 * `<userId>/<timestamp>-<name>`. Because the Partner project cannot
 * authenticate against this project's storage, we hand it a long-lived
 * signed URL (1 year) which travels inside `special_instructions`
 * ("Prescription: <url>") exactly as the partner-hub-webhook already expects.
 */

export const PRESCRIPTION_BUCKET = "order-prescriptions";
const STORAGE_KEY = "bloodlyn-order-prescription";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;
/** What's stored at most. Photos are shrunk first, so a large photo can still be picked. */
export const MAX_PRESCRIPTION_BYTES = 10 * 1024 * 1024;
const MAX_PICKED_PHOTO_BYTES = 40 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const FILE_TOO_LARGE = "File is too large. Please try a clearer, smaller photo.";

export interface StoredPrescription {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export const getStoredPrescription = (): StoredPrescription | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.url && parsed?.path) return parsed as StoredPrescription;
  } catch {
    // ignore malformed session data
  }
  return null;
};

export const setStoredPrescription = (value: StoredPrescription | null) => {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore restricted storage
  }
};

export const clearStoredPrescription = () => setStoredPrescription(null);

const ALLOWED = /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf)$/i;

export const validatePrescriptionFile = (file: File): string | null => {
  const looksPdf = /\.pdf$/i.test(file.name);
  if (!ALLOWED.test(file.type) && !looksPdf) {
    return "Only JPG, PNG or PDF files are supported.";
  }
  const isPdf = looksPdf || /pdf/i.test(file.type);
  if (isPdf && file.size > MAX_PDF_BYTES) return "PDF is too large. Maximum size is 5MB, or upload a photo instead.";
  if (file.size > MAX_PICKED_PHOTO_BYTES) return FILE_TOO_LARGE;
  return null;
};

/** Uploads the file and returns a shareable (signed) URL for the lab portal. */
export const uploadPrescription = async (
  picked: File,
  userId: string,
): Promise<StoredPrescription> => {
  const file = await compressImage(picked);
  if (file.size > MAX_PRESCRIPTION_BYTES) throw new Error(FILE_TOO_LARGE);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PRESCRIPTION_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : undefined),
    });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from(PRESCRIPTION_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error("Could not create a shareable link for the prescription.");
  }

  return {
    url: signed.signedUrl,
    path,
    name: file.name,
    size: file.size,
    type: file.type,
  };
};

/** Best-effort removal of an uploaded prescription. */
export const deletePrescription = async (path: string) => {
  try {
    await supabase.storage.from(PRESCRIPTION_BUCKET).remove([path]);
  } catch {
    // ignore — orphan cleanup is not critical
  }
};
