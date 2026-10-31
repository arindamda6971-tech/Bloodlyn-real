import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PACKAGES_QUERY_KEY, fetchActivePackages } from "@/lib/health-packages";
import { labServesPincode, useUserPincode } from "@/hooks/useUserPincode";
import { CATALOGUE_MAX_AGE_MS, CATALOGUE_QUERY_KEY, fetchCatalogue } from "@/lib/test-catalogue";

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
        queryClient.prefetchQuery({
          queryKey: ["bridge-tests-v2", "{}"],
          staleTime: 5 * 60 * 1000,
          queryFn: async () => {
            const { data, error } = await supabase.functions.invoke("bridge-proxy", {
              body: {
                endpoint: "bridge-tests",
                method: "GET",
                params: { status: "active", limit: "0" },
              },
            });
            if (error) throw new Error(error.message || "Failed to fetch tests");
            if (!data?.success) throw new Error("Bridge API returned unsuccessful response");
            return data;
          },
        }),
        queryClient.prefetchQuery({
          queryKey: CATALOGUE_QUERY_KEY,
          staleTime: CATALOGUE_MAX_AGE_MS,
          gcTime: CATALOGUE_MAX_AGE_MS,
          queryFn: fetchCatalogue,
        }),
        queryClient.prefetchQuery({
          queryKey: ACTIVE_PACKAGES_QUERY_KEY,
          staleTime: 5 * 60 * 1000,
          queryFn: fetchActivePackages,
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
