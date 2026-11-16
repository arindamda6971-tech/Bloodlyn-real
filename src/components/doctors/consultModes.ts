import { Phone, Video } from "lucide-react";
import type { ConsultType } from "@/lib/doctor-finder";

export type { ConsultType };

/** How each kind of online consultation is named and drawn. */
export const MODES: Record<ConsultType, { label: string; short: string; icon: typeof Video; note: string }> = {
  video: { label: "Video consultation", short: "Video", icon: Video, note: "Face to face on Google Meet" },
  audio: { label: "Audio consultation", short: "Audio", icon: Phone, note: "Voice only on Google Meet" },
};

/** The fee for one way of consulting, 0 when the doctor doesn't offer it. */
export const feeOf = (doctor: { videoCallFee: number; audioCallFee: number }, type: ConsultType) =>
  type === "video" ? doctor.videoCallFee : doctor.audioCallFee;
