/**
 * Doctor consultations run on Google Meet. The doctor opens a meeting and its link
 * reaches the patient's booking (orders.meet_link); the patient joins from the incoming
 * call alert or the appointment page.
 */
export const MEET_APP_URL = "https://play.google.com/store/apps/details?id=com.google.android.apps.tachyon";

const MEET_LINK = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

/** The booking's Google Meet link, or null when there isn't a valid one yet. */
export const meetLinkOf = (order: { meet_link?: string | null } | null | undefined): string | null =>
  order?.meet_link && MEET_LINK.test(order.meet_link) ? order.meet_link : null;

/** Opens Google Meet: the Meet app on a phone that has it, the browser otherwise. */
export function openMeet(url: string) {
  if (!window.open(url, "_system")) window.open(url, "_blank");
}
