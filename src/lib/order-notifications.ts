/**
 * Customer notifications for order status changes made by the lab (Partner
 * portal → update-order-status → orders row update → realtime here).
 *
 * The statuses below are the ones the Partner portal actually sends. Realtime
 * does not include the previous row (the orders table has no REPLICA IDENTITY
 * FULL), so "did the status change?" is answered by remembering which status
 * each order was last notified for: one notification per order per status,
 * however many times the row is updated afterwards (partner phone, report
 * link, timestamps…).
 */

export interface OrderNotificationContent {
  title: string;
  message: string;
}

interface OrderRow {
  status?: string | null;
  delivery_partner_name?: string | null;
  delivery_partner_phone?: string | null;
  cancellation_reason?: string | null;
  cancel_reason?: string | null;
}

/** What to tell the customer for a status, or null when it isn't worth a notification. */
export function orderStatusNotification(order: OrderRow): OrderNotificationContent | null {
  const partner = order.delivery_partner_name?.trim();
  const phone = order.delivery_partner_phone?.trim();
  switch (order.status) {
    case "confirmed":
      return { title: "Booking confirmed ✅", message: "Your booking is confirmed. The lab will accept it shortly." };
    case "accepted":
      return { title: "Lab accepted your booking ✅", message: "The lab has accepted your booking. A phlebotomist will be assigned soon." };
    case "partner_assigned":
      return {
        title: "Phlebotomist assigned 🩺",
        message: partner
          ? `${partner} will collect your sample${phone ? ` (${phone})` : ""}. Tap to track.`
          : "A phlebotomist has been assigned to collect your sample. Tap to track.",
      };
    case "collection_pending":
      return { title: "Sample collection scheduled", message: "Your phlebotomist is preparing to collect your sample. Tap to track." };
    case "sample_collected":
    case "collected":
      return { title: "Sample collected 🧪", message: "Your sample has been collected and is on its way to the lab." };
    case "processing":
      return { title: "Testing in progress 🔬", message: "The lab is testing your sample." };
    case "report_ready":
      return { title: "Your report is ready 📄", message: "Your test report is ready. Tap to view and download." };
    case "completed":
      return { title: "Booking completed ✅", message: "Your booking is complete. Your report is available in Reports." };
    case "cancelled": {
      const reason = (order.cancellation_reason || order.cancel_reason || "").trim();
      return { title: "Booking cancelled", message: reason ? `Your booking was cancelled: ${reason}` : "Your booking was cancelled." };
    }
    default:
      return null; // e.g. pending, or statuses customers don't need to hear about
  }
}

const NOTIFIED_KEY = "bloodlyn-notified-order-statuses";
const MAX_REMEMBERED = 300;

function readNotified(storage: Storage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(NOTIFIED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * True the first time it is called for this order and status, false after:
 * remembered in localStorage so a reload or reconnect doesn't notify again.
 */
export function shouldNotifyStatus(orderId: string, status: string, storage: Storage = localStorage): boolean {
  if (!orderId || !status) return false;
  const key = `${orderId}:${status}`;
  const notified = readNotified(storage);
  if (notified.includes(key)) return false;
  notified.push(key);
  try {
    storage.setItem(NOTIFIED_KEY, JSON.stringify(notified.slice(-MAX_REMEMBERED)));
  } catch {
    // Storage unavailable: still notify this once.
  }
  return true;
}
