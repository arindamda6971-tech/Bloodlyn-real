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
      let dbOrders: Order[] = [];
      try {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && Array.isArray(data)) dbOrders = data as Order[];
      } catch (e) {
        console.warn("Error fetching DB orders:", e);
      }

      let bloodLynOrders: Order[] = [];
      try {
        const { data } = await (supabase as any)
          .from("blood_lyn_orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && Array.isArray(data)) {
          bloodLynOrders = data.map((b: any) => ({
            id: b.id,
            order_number: b.order_number || b.external_order_id || `#${b.id.slice(0, 8)}`,
            status: b.status,
            total: b.total_amount || 0,
            created_at: b.created_at,
            test_name: b.test_name || "Diagnostic Test",
            lab_name: b.lab_name || "BloodLyn Partner Lab",
            scheduled_date: b.scheduled_date || null,
            scheduled_time_slot: b.scheduled_time_slot || null,
            patient_name: b.patient_name || b.customer_name || "Patient",
            delivery_partner_name: b.delivery_partner_name || null,
            delivery_partner_phone: b.delivery_partner_phone || null,
            report_url: b.report_url || null,
          }));
        }
      } catch (e) {
        console.warn("Error fetching blood_lyn_orders:", e);
      }

      let storedOrders: Order[] = [];
      try {
        const savedStr = localStorage.getItem("healthswift_real_orders") || localStorage.getItem("blood_lyn_real_orders");
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (Array.isArray(parsed)) storedOrders = parsed;
        }
      } catch (e) {
        console.warn("Stored orders parse error:", e);
      }

      const mergedMap = new Map<string, Order>();
      for (const o of dbOrders) {
        if (o && o.id) mergedMap.set(String(o.id), o);
      }
      for (const o of bloodLynOrders) {
        if (o && o.id) {
          const existing = mergedMap.get(String(o.id));
          mergedMap.set(String(o.id), existing ? { ...existing, ...o } : o);
        }
      }
      // Locally cached orders are optimistic only and are user-editable, so the
      // database row always wins on any field it already provides.
      for (const o of storedOrders) {
        if (o && o.id) {
          const existing = mergedMap.get(String(o.id));
          mergedMap.set(String(o.id), existing ? { ...o, ...existing } : o);
        }
      }

      const combined = Array.from(mergedMap.values());
      combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      return combined;
    },
    staleTime: 1000 * 3, // 3s stale time for responsive sync
  });
};
