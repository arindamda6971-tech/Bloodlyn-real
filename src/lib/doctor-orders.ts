/**
 * Doctor consultations are stored as orders too. Their test_name is written by the
 * consult flow as "<Video Call | Audio Call | Physical Appointment> with <doctor> (<patient>)".
 * These helpers tell them apart from lab orders and read what the tile needs.
 */
export type ConsultMode = "video" | "audio" | "clinic";

export interface ConsultInfo {
  mode: ConsultMode;
  doctorName: string;
  patientName: string | null;
}

const CONSULT_NAME = /^(Video Call|Audio Call|Physical Appointment|Clinic Visit) with (.+?)(?: \(([^()]*)\))?$/i;

interface OrderLike {
  order_number?: string | null;
  test_name?: string | null;
}

export function consultInfo(order: OrderLike): ConsultInfo | null {
  const match = (order.test_name || "").trim().match(CONSULT_NAME);
  if (!match) {
    return order.order_number?.startsWith("DOC")
      ? { mode: "video", doctorName: order.test_name || "Doctor", patientName: null }
      : null;
  }
  const kind = match[1].toLowerCase();
  return {
    mode: kind.startsWith("video") ? "video" : kind.startsWith("audio") ? "audio" : "clinic",
    doctorName: match[2].trim(),
    patientName: match[3]?.trim() || null,
  };
}

export const isDoctorOrder = (order: OrderLike): boolean => consultInfo(order) !== null;

export type ConsultStatus = "upcoming" | "completed" | "cancelled";

export function consultStatus(status: string | null | undefined): ConsultStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed" || status === "report_ready" || status === "report_delivered") return "completed";
  return "upcoming";
}
