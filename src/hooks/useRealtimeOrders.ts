import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type OrderStatus = "pending" | "confirmed" | "accepted" | "processing" | "in_progress" | "sample_collected" | "report_ready" | "completed" | "cancelled";

interface OrderUpdate {
  id: string;
  status: OrderStatus | null;
  payment_status: string | null;
}

/**
 * Subscribe to real-time updates on the orders table for the current user.
 * Users will see their order status change live without page refresh.
 */
export const useRealtimeOrders = (orderId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [latestStatus, setLatestStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (!user) return;

    // Build filter for the subscription
    const filter = orderId
      ? `id=eq.${orderId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`orders-realtime-${orderId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter,
        },
        (payload) => {
          console.log("Orders realtime update:", payload);

          const newData = payload.new as OrderUpdate;
          const oldData = payload.old as OrderUpdate;

          // Update local state
          setLatestStatus(newData.status);

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["order", newData.id] });
          queryClient.invalidateQueries({ queryKey: ["bookings"] });

          // Show toast for status changes
          if (oldData.status !== newData.status && newData.status) {
            const statusMessages: Record<string, string> = {
              pending: "Your order is pending confirmation",
              confirmed: "Your order has been confirmed! 🎉",
              accepted: "Your order has been accepted! 🎉",
              processing: "Collection partner has been assigned",
              in_progress: "Sample collection is in progress",
              sample_collected: "Sample has been collected! 🧪",
              report_ready: "Your report is ready! 📋",
              completed: "Your order has been completed! ✅",
              cancelled: "Your order has been cancelled",
            };

            const message = statusMessages[newData.status];
            if (message) {
              if (newData.status === "completed") {
                toast.success(message);
              } else if (newData.status === "cancelled") {
                toast.error(message);
              } else {
                toast.info(message);
              }
            }
          }

          // Notify payment status changes
          if (oldData.payment_status !== newData.payment_status) {
            if (newData.payment_status === "completed") {
              toast.success("Payment confirmed! ✅");
            } else if (newData.payment_status === "failed") {
              toast.error("Payment failed. Please try again.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orderId, queryClient]);

  return { latestStatus };
};
