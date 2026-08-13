import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OrderData {
  id: string;
  order_number: string | null;
  status: string | null;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  total: number;
  subtotal: number;
  discount: number | null;
  created_at: string;
  test_name: string | null;
  lab_name: string | null;
  lab_id?: string | null;
  payment_status: string | null;
  payment_method: string | null;
  report_url: string | null;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
  patient_name?: string | null;
  family_members?: {
    full_name: string;
  } | null;
  special_instructions?: string | null;
}

export interface OrderItem {
  id: string;
  test_id: string | null;
  package_id: string | null;
  price: number;
  quantity: number | null;
}

export const useOrderDetails = (orderId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["order", orderId, user?.id],
    queryFn: async () => {
      if (!orderId || !user?.id) throw new Error("Missing parameters");

      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);

      if (orderRes.error || !orderRes.data) {
        throw new Error("Order not found");
      }
      
      if (itemsRes.error) {
        throw new Error("Failed to load order items");
      }

      const items = (itemsRes.data as OrderItem[]) || [];
      const testNames: string[] = [];

      if (items.length > 0) {
        const testIds = items.map((i) => i.test_id).filter((id): id is string => !!id);
        const packageIds = items.map((i) => i.package_id).filter((id): id is string => !!id);

        if (testIds.length > 0) {
          const { data: tests } = await supabase.from("tests").select("id, name").in("id", testIds);
          if (tests) tests.forEach((t) => testNames.push(t.name));
        }

        if (packageIds.length > 0) {
          const { data: packages } = await supabase.from("test_packages").select("id, name").in("id", packageIds);
          if (packages) packages.forEach((p) => testNames.push(p.name));
        }
      }

      // Fallback to order.test_name
      if (testNames.length === 0 && orderRes.data.test_name) {
        testNames.push(...orderRes.data.test_name.split(",").map((n: string) => n.trim()).filter(Boolean));
      }

      return {
        order: orderRes.data as OrderData,
        items,
        testNames,
      };
    },
    enabled: !!orderId && !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
};
