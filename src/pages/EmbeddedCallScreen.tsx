import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function EmbeddedCallScreen() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>("Patient");
  
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode") || "video";

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data?.full_name) {
          setUserName(data.full_name);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleReadyToClose = async () => {
    if (id) {
      await supabase.from("orders").update({ call_status: "ended" }).eq("id", id);
    }
    // Navigate back to tracking screen
    navigate(`/tracking/${id}`);
  };

  if (!id) return null;

  const roomName = `bloodlyn${id.replace(/-/g, "")}`;

  return (
    <div className="w-full h-[100dvh] bg-black fixed inset-0 z-50">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: mode === 'audio',
          disableDeepLinking: true,
          disableModeratorIndicator: true,
          startScreenSharing: false,
          enableEmailInStats: false,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'tileview'],
          SHOW_CHROME_EXTENSION_BANNER: false,
          SHOW_DEEP_LINKING_IMAGE: false,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        }}
        userInfo={{
          displayName: userName,
        }}
        onApiReady={(externalApi) => {
          externalApi.addListener('videoConferenceLeft', handleReadyToClose);
          externalApi.addListener('readyToClose', handleReadyToClose);
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
          iframeRef.style.border = 'none';
        }}
      />
    </div>
  );
}
