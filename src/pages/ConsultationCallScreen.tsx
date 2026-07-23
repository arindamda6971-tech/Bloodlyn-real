import { useParams, useNavigate, useLocation } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ConsultationCallScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Try to get ID from state (if navigated with state) or fallback to a default room
  const id = location.state?.id || "demo-consultation-room";

  return (
    <div className="w-full h-[100dvh] bg-black relative">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={`healthswift-consult-${id}`}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'security'
          ],
        }}
        userInfo={{
          displayName: user?.email ? user.email.split('@')[0] : 'Patient'
        }}
        onApiReady={(externalApi) => {
          externalApi.addListener('readyToClose', () => {
            navigate('/home');
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
        }}
        spinner={() => (
          <div className="flex flex-col items-center justify-center h-full text-white absolute inset-0">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Connecting to your doctor...</p>
          </div>
        )}
      />
    </div>
  );
};

export default ConsultationCallScreen;