import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PreviousOrder {
  id: string;
  order_number: string | null;
  test_name: string | null;
  total: number;
  status: string | null;
  created_at: string;
}

export function usePreviousOrders(limit: number = 3) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["previous-orders", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      // An expired token doesn't fail here, it just hides every row behind the
      // row rules. Check the session is live, and throw if it isn't, so an empty
      // answer is never mistaken for "nothing booked yet".
      const { data: live } = await supabase.auth.getSession();
      if (!live.session) throw new Error("Your session has expired. Please sign in again.");

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, test_name, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PreviousOrder[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
