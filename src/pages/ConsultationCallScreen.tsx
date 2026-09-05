import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  RotateCcw,
  SwitchCamera,
  MessageCircle,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Professional {
  id: number;
  name: string;
  specialty: string;
  image: string;
  consultationFee: number;
}

interface LocationState {
  type: "video" | "audio";
  professional: Professional;
  professionalType: "doctor" | "physiotherapist";
}

const ConsultationCallScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Redirect if no state
  useEffect(() => {
    if (!state) {
      toast.error("Invalid consultation request");
      navigate("/home");
    }
  }, [state, navigate]);

  // Simulate call connection
  useEffect(() => {
    if (!state) return;

    const connectTimer = setTimeout(() => {
      setCallStatus("ringing");
    }, 1500);

    const ringTimer = setTimeout(() => {
      setCallStatus("connected");
      toast.success(`Connected with ${state.professional.name}`);
    }, 4000);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(ringTimer);
    };
  }, [state]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== "connected") return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    toast.info("Call ended", {
      description: `Duration: ${formatDuration(callDuration)}`,
    });
    setTimeout(() => {
      navigate("/home");
    }, 1500);
  };

  if (!state) return null;

  const { type, professional, professionalType } = state;
  const isVideoCall = type === "video";

  return (
    <div className="fixed inset-0 bg-secondary z-50 flex flex-col">
      {/* Video/Avatar Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video / Avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideoCall && callStatus === "connected" && !isVideoOff ? (
            <div className="w-full h-full bg-gradient-to-br from-secondary via-secondary/90 to-secondary/80">
              {/* Simulated remote video - in real app this would be the WebRTC stream */}
              <img loading="lazy" decoding="async"
                src={professional.image}
                alt={professional.name}
                className="w-full h-full object-cover opacity-30 blur-sm"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <img loading="lazy" decoding="async"
                    src={professional.image}
                    alt={professional.name}
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary shadow-2xl"
                  />
                  <h2 className="text-xl font-bold text-white mt-4">{professional.name}</h2>
                  <p className="text-white/70 text-sm">{professional.specialty}</p>
                </motion.div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="relative">
                <img loading="lazy" decoding="async"
                  src={professional.image}
                  alt={professional.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary/50 shadow-2xl"
                />
                {callStatus === "connecting" || callStatus === "ringing" ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-4 border-primary/30"
                  />
                ) : null}
              </div>
              <h2 className="text-xl font-bold text-white mt-4">{professional.name}</h2>
              <p className="text-white/70 text-sm">{professional.specialty}</p>
            </motion.div>
          )}
        </div>

        {/* Status overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 safe-area-top">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-black/30 text-white border-0">
              {professionalType === "doctor" ? "Doctor" : "Physiotherapist"}
            </Badge>
            <Badge
              variant={callStatus === "connected" ? "live" : "secondary"}
              className={callStatus !== "connected" ? "bg-black/30 text-white border-0" : ""}
            >
              {callStatus === "connecting" && "Connecting..."}
              {callStatus === "ringing" && "Ringing..."}
              {callStatus === "connected" && formatDuration(callDuration)}
              {callStatus === "ended" && "Call Ended"}
            </Badge>
          </div>
        </div>

        {/* Self view (for video calls) */}
        {isVideoCall && callStatus === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl bg-muted border-2 border-border overflow-hidden shadow-xl"
          >
            {isVideoOff ? (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center relative">
                <span className="text-xs text-muted-foreground font-medium">{facingMode === "user" ? "Front Cam" : "Back Cam"}</span>
                <span className="text-[9px] text-muted-foreground/70">Active</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Call Controls */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        {/* Call status text */}
        <AnimatePresence mode="wait">
          {callStatus !== "connected" && callStatus !== "ended" && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center text-white/80 font-medium mb-4 drop-shadow-md"
            >
              {callStatus === "connecting" && "Establishing secure connection..."}
              {callStatus === "ringing" && `Calling ${professional.name}...`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Control buttons */}
        <div className="flex items-center gap-4 bg-black/60 px-6 py-4 rounded-[2rem] border border-white/10 shadow-2xl">
          {/* Mute */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
            }}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video toggle (only for video calls) */}
          {isVideoCall && (
            <>
              <button
                onClick={() => {
                  setIsVideoOff(!isVideoOff);
                  toast.info(isVideoOff ? "Camera on" : "Camera off");
                }}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${isVideoOff ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Toggle Video"
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>

              <button
                onClick={() => {
                  const nextMode = facingMode === "user" ? "environment" : "user";
                  setFacingMode(nextMode);
                  toast.success(`Switched to ${nextMode === "user" ? "front" : "back"} camera (conference unaffected)`);
                }}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 bg-white/10 text-white hover:bg-white/20"
                title="Switch Camera"
              >
                <SwitchCamera className="w-6 h-6" />
              </button>
            </>
          )}

          {/* End call */}
          <button
            onClick={handleEndCall}
            disabled={callStatus === "ended"}
            className="flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-red-500 text-white hover:bg-red-600 transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Speaker */}
          <button
            onClick={() => {
              setIsSpeakerOn(!isSpeakerOn);
              toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
            }}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${!isSpeakerOn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Volume2 className="w-6 h-6" />
          </button>

          {/* More options */}
          <button
            onClick={() => toast.info("More options coming soon")}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 bg-white/10 text-white hover:bg-white/20"
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        {/* Fee info */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Consultation fee: ₹{professional.consultationFee}
        </p>
      </motion.div>
    </div>
  );
};

export default ConsultationCallScreen;