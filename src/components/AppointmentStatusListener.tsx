import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AppointmentStatusListener() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id && !user?.email && !user?.phone) return;

    // Build filter query for user appointments
    const userPhone = user?.phone ? user.phone.replace(/\D/g, "").slice(-10) : "";

    const channel = supabase
      .channel("appointment-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
        },
        (payload: any) => {
          const newAppt = payload.new;
          const oldAppt = payload.old;

          // Check if appointment belongs to current user
          const matchesUser =
            newAppt.patient_email === user?.email ||
            (userPhone && newAppt.patient_phone && newAppt.patient_phone.includes(userPhone)) ||
            newAppt.user_id === user?.id;

          if (!matchesUser) return;
          if (oldAppt && oldAppt.status === newAppt.status) return;

          const doctorName = newAppt.doctor_name || "Your Doctor";

          if (newAppt.status === "in_consultation") {
            toast.success(`🎉 ${doctorName} is ready for your consultation!`, {
              description: "Tap to join your video/audio consultation call.",
              action: {
                label: "Join Call",
                onClick: () => navigate(`/consultation/call/${newAppt.id}?mode=${newAppt.mode || 'video'}`),
              },
              duration: 10000,
            });
          } else if (newAppt.status === "completed") {
            toast.success(`📄 Consultation completed by ${doctorName}`, {
              description: "Your digital e-prescription is ready.",
              action: {
                label: "View Rx",
                onClick: () => navigate("/reports"),
              },
              duration: 8000,
            });
          } else if (newAppt.status === "cancelled") {
            toast.error(`⚠️ Consultation with ${doctorName} was cancelled.`, {
              duration: 6000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload: any) => {
          const newOrder = payload.new;
          const oldOrder = payload.old;
          if (oldOrder && oldOrder.status === newOrder.status) return;

          if (newOrder.status === "completed") {
            toast.success("🎉 Your order has been completed!", {
              description: "View your report & prescription.",
              action: {
                label: "View Report",
                onClick: () => navigate("/reports"),
              },
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, user?.phone, navigate]);

  return null;
}

export default AppointmentStatusListener;
