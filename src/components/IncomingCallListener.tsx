import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { consultInfo } from "@/lib/doctor-orders";
import { meetLinkOf, openMeet } from "@/lib/meet";
import { tellDoctor } from "@/lib/callSignal";

// Stop ringing after this long; the doctor can ring again.
const RING_TIMEOUT_MS = 45_000;
// A ring this recent still rings when the app is opened (it was closed or asleep).
const LATE_RING_WINDOW_MS = 3 * 60_000;

interface IncomingCall {
  id: string;
  doctorName: string;
  audioOnly: boolean;
  /** The Google Meet the doctor opened; the consultation happens there. */
  meetLink: string | null;
}

interface RingingOrder {
  id: string;
  status?: string | null;
  call_status?: string | null;
  call_status_at?: string | null;
  test_name?: string | null;
  order_number?: string | null;
  lab_name?: string | null;
  meet_link?: string | null;
}

const callFrom = (order: RingingOrder): IncomingCall => {
  const info = consultInfo(order);
  return {
    id: order.id,
    doctorName: info?.doctorName || order.lab_name || "Your doctor",
    audioOnly: info?.mode === "audio",
    meetLink: meetLinkOf(order),
  };
};

/**
 * The doctor starts a consultation on Google Meet and rings the patient's app: this shows
 * the incoming-call alert, with the BloodLyn ringtone, and "Join on Google Meet". The
 * doctor is told whether the patient joined, declined or didn't answer.
 */
export function IncomingCallListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const incomingCallRef = useRef<IncomingCall | null>(null);
  // Rings already answered, declined or run out: they don't ring again on reopening.
  const handledRef = useRef(new Set<string>());

  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (!incomingCall) return;
    // Ring with the BloodLyn ringtone until answered, declined, ended or timed out.
    startRingtone();
    const timeout = setTimeout(() => {
      setIncomingCall(null);
      void tellDoctor(incomingCall.id, "patient-missed");
    }, RING_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
      stopRingtone();
    };
  }, [incomingCall]);

  const ring = useCallback((order: RingingOrder) => {
    if (incomingCallRef.current?.id === order.id) return;
    // Each ring carries the time the doctor pressed it; "Ring again" is a new one.
    if (order.call_status_at) {
      const key = `${order.id}|${order.call_status_at}`;
      if (handledRef.current.has(key)) return;
      handledRef.current.add(key);
    }
    const call = callFrom(order);
    setIncomingCall(call);
    // In the background the alert can't be seen: put a notification on the phone too.
    if (Capacitor.isNativePlatform() && document.visibilityState === "hidden") {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1_000_000),
            title: `${call.doctorName} is calling`,
            body: "Open BloodLyn to join your consultation on Google Meet.",
            schedule: { at: new Date(Date.now() + 500) },
            extra: { url: `/appointment/${order.id}` },
          },
        ],
      }).catch((err) => console.warn("Couldn't show the call notification", err));
    }
  }, []);

  // The app was closed or asleep when the doctor rang: ring now if it was just then.
  const checkForLateRing = useCallback(async () => {
    if (!user?.id || incomingCallRef.current) return;
    try {
      const since = new Date(Date.now() - LATE_RING_WINDOW_MS).toISOString();
      // call_status, call_status_at and meet_link aren't in the generated types yet.
      const { data, error } = await (supabase.from("orders") as any)
        .select("id, status, call_status, call_status_at, test_name, order_number, lab_name, meet_link")
        .eq("user_id", user.id)
        .eq("call_status", "ringing")
        .gte("call_status_at", since)
        .order("call_status_at", { ascending: false })
        .limit(1);
      if (error) return;
      const order = (data as RingingOrder[] | null)?.[0];
      if (order && order.status !== "cancelled" && order.status !== "completed") ring(order);
    } catch (err) {
      console.warn("Couldn't check for a missed ring", err);
    }
  }, [user?.id, ring]);

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
          const newOrder = payload.new as RingingOrder;
          if (newOrder.call_status === "ringing" && newOrder.status !== "cancelled") {
            ring(newOrder);
          } else if (
            // The doctor portal reports completed / missed / cancelled when a call stops.
            ["ended", "completed", "missed", "cancelled", "failed"].includes(newOrder.call_status ?? "") &&
            incomingCallRef.current?.id === newOrder.id
          ) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    void checkForLateRing();
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForLateRing();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id, ring, checkForLateRing]);

  const handleJoin = async () => {
    if (!incomingCall) return;
    const { id, meetLink } = incomingCall;
    setIncomingCall(null);
    // Coming back from Meet lands on the appointment (prescription, status).
    navigate(`/appointment/${id}`);
    if (meetLink) {
      openMeet(meetLink);
      void tellDoctor(id, "patient-joined");
      await supabase.from("orders").update({ call_status: "in_progress" } as any).eq("id", id);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    const { id } = incomingCall;
    setIncomingCall(null);
    void tellDoctor(id, "patient-declined");
    await supabase.from("orders").update({ call_status: "ended" } as any).eq("id", id);
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
