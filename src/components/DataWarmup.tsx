import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { labServesPincode, useUserPincode } from "@/hooks/useUserPincode";
import { testCatalogueQueryOptions } from "@/hooks/useTestCatalogue";

/**
 * Aggressive background warm-up of the data every screen needs first.
 *
 * Runs once during idle time after first paint and seeds the SAME React Query
 * keys the screens use, so navigating to Home / Labs / Categories renders from
 * cache instantly instead of flashing an empty skeleton.
 *
 * Read-only: uses the existing Supabase client + RLS, adds no new endpoints and
 * never mutates anything.
 */
const DataWarmup = () => {
  const queryClient = useQueryClient();
  const { pincode } = useUserPincode();

  useEffect(() => {
    let cancelled = false;

    const warm = async () => {
      if (cancelled) return;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ["diagnostic-centers", pincode],
          staleTime: 5 * 60 * 1000,
          queryFn: async () => {
            const { data, error } = await supabase
              .from("diagnostic_centers")
              .select("*")
              .order("rating", { ascending: false });
            if (error) throw error;
            return pincode
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? (data ?? []).filter((c) => labServesPincode(c as any, pincode))
              : data ?? [];
          },
        }),
        // The full test catalogue (one request): Explore Tests, categories and the
        // Home search all read it, so they open with real data and search instantly.
        queryClient.prefetchQuery(testCatalogueQueryOptions),
        queryClient.prefetchQuery({
          queryKey: ["home-test-packages"],
          staleTime: 5 * 60 * 1000,
          queryFn: async () => {
            const { data, error } = await supabase
              .from("test_packages")
              .select(
                `id, name, price, discount_percent, is_active, diagnostic_center_id,
                 diagnostic_centers!diagnostic_center_id ( id, name, logo_url )`
              )
              .eq("is_active", true)
              .order("is_popular", { ascending: false });
            if (error) throw error;
            return (data as any) || [];
          },
        }),
      ]);
    };

    const ric =
      (window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1400));

    const handle = ric(() => void warm(), { timeout: 4000 });

    return () => {
      cancelled = true;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback;
      if (cic && typeof handle === "number") cic(handle);
    };
  }, [queryClient, pincode]);

  return null;
};

export default DataWarmup;
