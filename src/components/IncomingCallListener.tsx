import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function IncomingCallListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<{ id: string; doctorName?: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("public:orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder.call_status === "ringing") {
            // Check if we are already in the call to avoid re-ringing
            if (window.location.pathname.includes(`/call/${newOrder.id}`)) return;
            
            const doctorName = newOrder.lab_name || newOrder.test_name || "Doctor";
            setIncomingCall({ id: newOrder.id, doctorName });
            
            // Optional: Play a ringing sound here
            // const audio = new Audio('/ringtone.mp3');
            // audio.play().catch(e => console.log(e));
          } else if (newOrder.call_status === "ended" && incomingCall?.id === newOrder.id) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, incomingCall?.id]);

  const handleAccept = async (mode: 'audio' | 'video') => {
    if (!incomingCall) return;
    const callId = incomingCall.id;
    
    // Update status to in-progress
    await supabase.from("orders").update({ call_status: "in-progress" }).eq("id", callId);
    
    setIncomingCall(null);
    navigate(`/call/${callId}?mode=${mode}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    
    await supabase.from("orders").update({ call_status: "ended" }).eq("id", incomingCall.id);
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed inset-x-4 top-12 z-[100] bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Video className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-1">Incoming Video Call</h3>
            <p className="text-gray-400 mb-8">{incomingCall.doctorName}</p>
            
            <div className="flex items-center gap-6 w-full justify-center">
              <button
                onClick={handleDecline}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              
              <button
                onClick={() => handleAccept('audio')}
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-lg animate-bounce"
                title="Accept Audio"
              >
                <Phone className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={() => handleAccept('video')}
                className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors shadow-lg animate-bounce"
                title="Accept Video"
              >
                <Video className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
