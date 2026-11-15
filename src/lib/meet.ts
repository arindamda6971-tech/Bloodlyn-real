/**
 * Doctor consultations run on Google Meet. The doctor opens a meeting and its link
 * reaches the patient's booking (orders.meet_link); the patient joins from the incoming
 * call alert or the appointment page.
 */
export const MEET_ANDROID_URL = "https://play.google.com/store/apps/details?id=com.google.android.apps.tachyon";
export const MEET_IOS_URL = "https://apps.apple.com/app/google-meet/id1096918571";
/** Kept for older imports: the Android listing. */
export const MEET_APP_URL = MEET_ANDROID_URL;

const MEET_LINK = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

/** Where this phone installs Google Meet: the App Store on an iPhone or iPad, Google Play otherwise. */
export function meetInstallUrl(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const touchMac = /Macintosh/.test(userAgent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(userAgent) || touchMac ? MEET_IOS_URL : MEET_ANDROID_URL;
}

/** Call states after which the consultation's Meet can't be joined from BloodLyn any more. */
const CALL_OVER = new Set(["ended", "completed", "cancelled"]);

/** The doctor ended the call (or the consultation is over): "Join" is gone for good. */
export const callEnded = (order: { call_status?: string | null } | null | undefined): boolean =>
  CALL_OVER.has(String(order?.call_status ?? ""));

/**
 * The booking's Google Meet link, or null when there isn't a valid one yet, or when the
 * doctor has ended the call: then the patient can't rejoin from the app.
 */
export const meetLinkOf = (order: { meet_link?: string | null; call_status?: string | null } | null | undefined): string | null =>
  order?.meet_link && MEET_LINK.test(order.meet_link) && !callEnded(order) ? order.meet_link : null;

/** Opens Google Meet: the Meet app on a phone that has it, the browser otherwise. */
export function openMeet(url: string) {
  if (!window.open(url, "_system")) window.open(url, "_blank");
}
