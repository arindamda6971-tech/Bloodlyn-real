import { supabase } from "@/integrations/supabase/client";
import { tellDoctor } from "@/lib/callSignal";
import { openMeet } from "@/lib/meet";

/**
 * The patient joins the doctor's Google Meet, from the ringing screen or the appointment
 * page: Meet opens, the doctor's portal shows "Patient joined", and the booking stops
 * ringing, so no "Missed call" alert follows on the phone.
 */
export async function joinConsultation(orderId: string, link: string) {
  openMeet(link);
  void tellDoctor(orderId, "patient-joined");
  // call_status isn't in the generated types yet.
  const { error } = await supabase.from("orders").update({ call_status: "in_progress" } as never).eq("id", orderId);
  if (error) console.error("Couldn't mark the consultation joined", error);
}
