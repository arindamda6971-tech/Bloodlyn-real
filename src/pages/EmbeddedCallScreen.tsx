import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

export default function EmbeddedCallScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode") || "video";

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const channel = useRef<any>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(mode === 'audio');
  const [callStatus, setCallStatus] = useState("Connecting to doctor...");

  useEffect(() => {
    if (!id) return;

    const initCall = async () => {
      try {
        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: mode !== 'audio', 
          audio: true 
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Setup Peer Connection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnection.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus("Connected");
          }
        };

        // 3. Setup Supabase Channel
        const roomName = `webrtc-${id}`;
        const chan = supabase.channel(roomName);
        channel.current = chan;

        const iceQueue: RTCIceCandidate[] = [];

        chan.on('broadcast', { event: 'webrtc-offer' }, async (payload) => {
          if (payload.payload.offer) {
            setCallStatus("Answering call...");
            await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
            
            while(iceQueue.length > 0) {
              const candidate = iceQueue.shift();
              if (candidate) await pc.addIceCandidate(candidate).catch(e => console.error(e));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            chan.send({
              type: 'broadcast',
              event: 'webrtc-answer',
              payload: { answer }
            });
          }
        });

        chan.on('broadcast', { event: 'webrtc-ice' }, async (payload) => {
          if (payload.payload.candidate) {
            try {
              const candidate = new RTCIceCandidate(payload.payload.candidate);
              if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate);
              } else {
                iceQueue.push(candidate);
              }
            } catch (e) {
              console.error("Error adding ice candidate", e);
            }
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            chan.send({
              type: 'broadcast',
              event: 'webrtc-ice',
              payload: { candidate: event.candidate }
            });
          }
        };

        chan.on('broadcast', { event: 'doctor-ready' }, () => {
          // If doctor just connected, let them know we are already here
          chan.send({
            type: 'broadcast',
            event: 'patient-ready',
            payload: {}
          });
        });

        chan.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Signal to doctor that patient is ready to receive offer
            chan.send({
              type: 'broadcast',
              event: 'patient-ready',
              payload: {}
            });
          }
        });

      } catch (err) {
        console.error("Error accessing media devices.", err);
        setCallStatus("Failed to access camera/mic. Please allow permissions.");
      }
    };

    initCall();

    return () => {
      localStream.current?.getTracks().forEach(t => t.stop());
      peerConnection.current?.close();
      channel.current?.unsubscribe();
    };
  }, [id, mode]);

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleHangup = async () => {
    if (id) {
      await supabase.from("orders").update({ call_status: "ended" }).eq("id", id);
    }
    navigate(`/tracking/${id}`);
  };

  return (
    <div className="w-full h-[100dvh] bg-black fixed inset-0 z-50 flex flex-col relative overflow-hidden">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      <div className="absolute top-20 right-4 w-32 h-48 sm:w-48 sm:h-64 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 z-10">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
        />
        {isVideoOff && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <VideoOff className="w-8 h-8 text-gray-500" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between px-2">
          {isMuted && <MicOff className="text-red-500 w-4 h-4 drop-shadow-md" />}
        </div>
      </div>

      <div className="absolute top-20 left-4 bg-black/50 backdrop-blur px-4 py-2 rounded-xl text-white text-sm sm:text-base z-10">
        {callStatus}
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 bg-gray-900/80 backdrop-blur-md px-6 py-4 rounded-full border border-gray-800 z-10">
        <button 
          onClick={toggleMute}
          className={`p-3 sm:p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        
        <button 
          onClick={handleHangup}
          className="p-4 sm:p-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
        >
          <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        <button 
          onClick={toggleVideo}
          className={`p-3 sm:p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>
    </div>
  );
}
