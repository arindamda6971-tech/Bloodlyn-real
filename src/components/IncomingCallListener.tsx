import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { consultInfo } from "@/lib/doctor-orders";
import { meetLinkOf, openMeet } from "@/lib/meet";

// Stop ringing after this long; the doctor can ring again.
const RING_TIMEOUT_MS = 45_000;

interface IncomingCall {
  id: string;
  doctorName: string;
  audioOnly: boolean;
  /** The Google Meet the doctor opened; the consultation happens there. */
  meetLink: string | null;
}

/**
 * The doctor starts a consultation on Google Meet and rings the patient's app: this shows
 * the incoming-call alert, with the BloodLyn ringtone, and "Join on Google Meet".
 */
export function IncomingCallListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const incomingCallRef = useRef<IncomingCall | null>(null);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (!incomingCall) return;
    // Ring with the BloodLyn ringtone until answered, declined, ended or timed out.
    startRingtone();
    const timeout = setTimeout(() => setIncomingCall(null), RING_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
      stopRingtone();
    };
  }, [incomingCall]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new as any;
          if (newOrder.call_status === "ringing") {
            const info = consultInfo(newOrder);
            setIncomingCall({
              id: newOrder.id,
              doctorName: info?.doctorName || newOrder.lab_name || "Your doctor",
              audioOnly: info?.mode === "audio",
              meetLink: meetLinkOf(newOrder),
            });
          } else if (
            // The doctor portal reports completed / missed / cancelled when a call stops.
            ["ended", "completed", "missed", "cancelled", "failed"].includes(newOrder.call_status) &&
            incomingCallRef.current?.id === newOrder.id
          ) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleJoin = async () => {
    if (!incomingCall) return;
    const { id, meetLink } = incomingCall;
    setIncomingCall(null);
    // Coming back from Meet lands on the appointment (prescription, status).
    navigate(`/appointment/${id}`);
    if (meetLink) {
      openMeet(meetLink);
      await supabase.from("orders").update({ call_status: "in-progress" } as any).eq("id", id);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    await supabase.from("orders").update({ call_status: "ended" } as any).eq("id", incomingCall.id);
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, transform: "translateY(-50px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
          transition={{ transform: { type: "spring", stiffness: 500, damping: 25, restSpeed: 10 } }}
          exit={{ opacity: 0, transform: "translateY(-50px)" }}
          className="fixed inset-x-4 top-12 z-[100] bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              {incomingCall.audioOnly ? <Phone className="w-8 h-8 text-emerald-400" /> : <Video className="w-8 h-8 text-emerald-400" />}
            </div>
            <h3 className="text-xl font-semibold text-white mb-1 text-center">{incomingCall.doctorName} is calling</h3>
            <p className="text-gray-400 mb-6 text-sm text-center">
              {incomingCall.audioOnly ? "Audio consultation" : "Video consultation"} on Google Meet
            </p>

            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={handleDecline}
                className="w-14 h-14 shrink-0 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
                title="Decline"
                aria-label="Decline"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={handleJoin}
                className="h-14 flex-1 max-w-[220px] rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center gap-2 px-5 text-white font-bold transition-colors shadow-lg animate-bounce"
              >
                {incomingCall.audioOnly ? <Phone className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                {incomingCall.meetLink ? "Join on Google Meet" : "Open appointment"}
              </button>
            </div>
            {incomingCall.meetLink && (
              <p className="mt-4 text-[11px] text-gray-500 text-center">Opens the Google Meet app.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
