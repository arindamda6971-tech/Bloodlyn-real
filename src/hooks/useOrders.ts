import { useQuery } from "@tanstack/react-query";
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes for lightning fast subsequent loads
  });
};
