import { Building2, Phone, Video } from "lucide-react";

export type ConsultType = "video" | "audio" | "physical";

/** How each kind of consultation is named and drawn. */
export const MODES: Record<ConsultType, { label: string; short: string; icon: typeof Video; note: string }> = {
  video: { label: "Video consultation", short: "Video", icon: Video, note: "Face to face on Google Meet" },
  audio: { label: "Audio consultation", short: "Audio", icon: Phone, note: "Voice only on Google Meet" },
  physical: { label: "Clinic visit", short: "Clinic", icon: Building2, note: "See the doctor at the clinic" },
};
