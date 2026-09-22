import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the Admin-managed flat lab-test fee from bridge-settings responses.
 * The Admin function may return the setting directly or inside `data`/`settings`.
 */
export const parsePlatformFeeFlat = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const data = typeof root.data === "object" && root.data !== null
    ? root.data as Record<string, unknown>
    : null;
  const settings = typeof root.settings === "object" && root.settings !== null
    ? root.settings as Record<string, unknown>
    : null;
  const nestedSettings = data && typeof data.settings === "object" && data.settings !== null
    ? data.settings as Record<string, unknown>
    : null;

  const raw = root.lab_test_platform_fee_flat
    ?? data?.lab_test_platform_fee_flat
    ?? settings?.lab_test_platform_fee_flat
    ?? nestedSettings?.lab_test_platform_fee_flat;
  const fee = typeof raw === "number" || typeof raw === "string" ? Number(raw) : Number.NaN;

  return Number.isFinite(fee) && fee >= 0 ? fee : null;
};

/** Refreshes whenever checkout opens. Unavailable or invalid Admin data means ₹0. */
export const usePlatformFeeFlat = () => {
  const { data } = useQuery({
    queryKey: ["platform-fee-flat"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("bridge-proxy", {
        body: { endpoint: "bridge-settings", method: "GET" },
      });
      if (error) throw error;
      return parsePlatformFeeFlat(data) ?? 0;
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
    placeholderData: 0,
  });

  return data ?? 0;
};