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
              <img
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
                  <img
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
                <img
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
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Your camera</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Call Controls */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-6 safe-area-bottom"
      >
        {/* Call status text */}
        <AnimatePresence mode="wait">
          {callStatus !== "connected" && callStatus !== "ended" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-muted-foreground mb-4"
            >
              {callStatus === "connecting" && "Establishing secure connection..."}
              {callStatus === "ringing" && `Calling ${professional.name}...`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => {
              setIsMuted(!isMuted);
              toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
            }}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Video toggle (only for video calls) */}
          {isVideoCall && (
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => {
                setIsVideoOff(!isVideoOff);
                toast.info(isVideoOff ? "Camera on" : "Camera off");
              }}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>
          )}

          {/* End call */}
          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full"
            onClick={handleEndCall}
            disabled={callStatus === "ended"}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>

          {/* Speaker */}
          <Button
            variant={isSpeakerOn ? "secondary" : "outline"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => {
              setIsSpeakerOn(!isSpeakerOn);
              toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
            }}
          >
            <Volume2 className="w-6 h-6" />
          </Button>

          {/* More options */}
          <Button
            variant="secondary"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => toast.info("More options coming soon")}
          >
            <MoreVertical className="w-6 h-6" />
          </Button>
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