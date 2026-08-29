import { supabase } from "@/integrations/supabase/client";

/**
 * HOME-SCREEN "Upload Prescription & Get a Call" flow.
 *
 * Deliberately separate from the booking/cart prescription pipeline
 * (`src/lib/order-prescription.ts` → `order-prescriptions` bucket → lab portal).
 * These files live in the `prescriptions` bucket under
 * `<userId>/support/<timestamp>-<name>` and the resulting signed link is sent to
 * the Admin project's Help & Support desk as a support ticket — never to a lab.
 */

export const SUPPORT_PRESCRIPTION_BUCKET = "order-prescriptions";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;
export const MAX_SUPPORT_PRESCRIPTION_BYTES = 10 * 1024 * 1024;

const ALLOWED = /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf)$/i;

export const validateSupportPrescription = (file: File): string | null => {
  const looksPdf = /\.pdf$/i.test(file.name);
  if (!ALLOWED.test(file.type) && !looksPdf) {
    return "Only JPG, PNG or PDF files are supported.";
  }
  if (file.size > MAX_SUPPORT_PRESCRIPTION_BYTES) {
    return "File is too large. Maximum size is 10MB.";
  }
  return null;
};

export interface UploadedSupportPrescription {
  url: string;
  path: string;
  name: string;
}

/** Uploads to the private bucket and returns a long-lived signed link. */
export const uploadSupportPrescription = async (
  file: File,
  userId: string,
): Promise<UploadedSupportPrescription> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const path = `${userId}/support/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPPORT_PRESCRIPTION_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : undefined),
    });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from(SUPPORT_PRESCRIPTION_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error("Could not create a shareable link for the prescription.");
  }

  return { url: signed.signedUrl, path, name: file.name };
};
