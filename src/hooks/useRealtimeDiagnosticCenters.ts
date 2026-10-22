import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBurstDebouncer } from "@/lib/realtimeBurst";

/**
 * Subscribe to real-time updates on the diagnostic_centers table.
 * When vendors update center details (name, pricing, availability),
 * this hook will invalidate relevant queries to refresh the UI.
 */
export const useRealtimeDiagnosticCenters = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // One refresh per burst: partner syncs can update a center several times in a row.
    const refresh = createBurstDebouncer(() => {
      queryClient.invalidateQueries({ queryKey: ["diagnostic-centers"] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-labs"] });
    });

    const channel = supabase
      .channel("diagnostic-centers-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diagnostic_centers",
        },
        (payload) => {
          // Invalidate diagnostic center queries to refresh UI
          refresh.trigger();

          // Show toast for significant changes
          if (payload.eventType === "UPDATE") {
            const newData = payload.new as { name?: string; is_active?: boolean };
            if (newData.is_active === false) {
              toast.info(`${newData.name || "A diagnostic center"} is now unavailable`);
            }
          }

          if (payload.eventType === "INSERT") {
            const newData = payload.new as { name?: string };
            toast.success(`New diagnostic center added: ${newData.name || "Unknown"}`);
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
