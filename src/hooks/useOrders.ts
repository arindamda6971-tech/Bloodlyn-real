import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Order {
  id: string;
  order_number: string | null;
  status: string | null;
  total: number;
  created_at: string;
  test_name: string | null;
  lab_name: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  patient_name?: string | null;
  family_members?: {
    full_name: string;
  } | null;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("user_orders_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
          queryClient.invalidateQueries({ queryKey: ["order-details"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
      return (data as Order[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 5, // 5s stale time for responsive sync
  });
};
