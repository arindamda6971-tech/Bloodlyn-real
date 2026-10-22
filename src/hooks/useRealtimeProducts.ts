import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBurstDebouncer } from "@/lib/realtimeBurst";

/**
 * Subscribe to real-time updates on the products table.
 * When vendors update product details (price, availability, description),
 * this hook will invalidate relevant queries to refresh the UI.
 */
export const useRealtimeProducts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // One refresh per burst: a partner catalogue sync changes many rows at once.
    const refresh = createBurstDebouncer(() => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    });

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          // Invalidate product-related queries to refresh UI
          refresh.trigger();

          // Show toast for significant changes
          if (payload.eventType === "UPDATE") {
            const newData = payload.new as { product_name?: string; availability?: boolean };
            if (newData.availability === false) {
              toast.info(`Product "${newData.product_name}" is now unavailable`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      refresh.cancel();
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
